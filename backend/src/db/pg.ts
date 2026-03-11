import pg from "pg";
import type {
  BoxRecord,
  BoxStore,
  ListBoxesOptions,
  ListBoxesResult,
  BoxListItem,
  MyOpenItem,
} from "../db.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL required for Postgres (e.g. postgresql://blindbox:blindbox@localhost:5432/blindbox)");
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS boxes (
      box_id NUMERIC PRIMARY KEY,
      commitment NUMERIC NOT NULL,
      salt_hex TEXT NOT NULL,
      amount NUMERIC,
      tier INT,
      opened BOOLEAN NOT NULL DEFAULT FALSE,
      chain_registered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS open_nonces (
      user_address TEXT PRIMARY KEY,
      nonce NUMERIC NOT NULL DEFAULT 0
    );
    ALTER TABLE boxes ADD COLUMN IF NOT EXISTS opened_by TEXT;
    ALTER TABLE boxes ADD COLUMN IF NOT EXISTS open_tx_hash TEXT;
    ALTER TABLE boxes ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
    ALTER TABLE boxes ADD COLUMN IF NOT EXISTS reward_wei NUMERIC;
    ALTER TABLE boxes ADD COLUMN IF NOT EXISTS opened_reward_wei NUMERIC;
  `);
}

function rowToRecord(row: pg.QueryResultRow): BoxRecord {
  return {
    boxId: BigInt(row.box_id),
    commitment: BigInt(row.commitment),
    saltHex: row.salt_hex as `0x${string}`,
    amount: row.amount != null ? BigInt(row.amount) : undefined,
    rewardWei: row.reward_wei != null ? BigInt(row.reward_wei) : undefined,
    tier: row.tier ?? undefined,
    opened: row.opened,
    chainCommitmentRegisteredAt: row.chain_registered_at
      ? Math.floor(new Date(row.chain_registered_at).getTime() / 1000)
      : undefined,
    openedBy: row.opened_by as `0x${string}` | undefined,
    openTxHash: row.open_tx_hash as `0x${string}` | undefined,
    openedAt: row.opened_at
      ? Math.floor(new Date(row.opened_at).getTime() / 1000)
      : undefined,
  };
}

export class PgBoxStore implements BoxStore {
  async get(boxId: bigint): Promise<BoxRecord | undefined> {
    const r = await getPool().query("SELECT * FROM boxes WHERE box_id = $1", [boxId.toString()]);
    if (r.rows.length === 0) return undefined;
    return rowToRecord(r.rows[0]);
  }

  async register(record: BoxRecord): Promise<void> {
    try {
      await getPool().query(
        `INSERT INTO boxes (box_id, commitment, salt_hex, amount, tier, reward_wei, opened)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
        [
          record.boxId.toString(),
          record.commitment.toString(),
          record.saltHex,
          record.amount?.toString() ?? null,
          record.tier ?? null,
          record.rewardWei?.toString() ?? null,
        ]
      );
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
        throw new Error("Box already registered");
      }
      throw e;
    }
  }

  async markOpened(
    boxId: bigint,
    meta?: { openedBy: `0x${string}`; txHash: `0x${string}`; rewardWeiPaid?: bigint }
  ): Promise<void> {
    if (meta) {
      const r = await getPool().query(
        meta.rewardWeiPaid != null && meta.rewardWeiPaid > 0n
          ? `UPDATE boxes SET opened = TRUE, opened_by = $2, open_tx_hash = $3, opened_at = NOW(),
             opened_reward_wei = $4 WHERE box_id = $1`
          : `UPDATE boxes SET opened = TRUE, opened_by = $2, open_tx_hash = $3, opened_at = NOW()
             WHERE box_id = $1`,
        meta.rewardWeiPaid != null && meta.rewardWeiPaid > 0n
          ? [boxId.toString(), meta.openedBy.toLowerCase(), meta.txHash, meta.rewardWeiPaid.toString()]
          : [boxId.toString(), meta.openedBy.toLowerCase(), meta.txHash]
      );
      if (r.rowCount === 0) throw new Error("Box not found");
    } else {
      const r = await getPool().query("UPDATE boxes SET opened = TRUE WHERE box_id = $1", [
        boxId.toString(),
      ]);
      if (r.rowCount === 0) throw new Error("Box not found");
    }
  }

  async listOpensByUser(
    user: `0x${string}`,
    options: { limit: number; offset: number }
  ): Promise<{ items: MyOpenItem[]; total: number }> {
    const limit = Math.min(500, Math.max(1, options.limit));
    const offset = Math.max(0, options.offset);
    const pool = getPool();
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS n FROM boxes WHERE opened = TRUE AND opened_by = $1`,
      [user.toLowerCase()]
    );
    const total = countR.rows[0]?.n ?? 0;
    const dataR = await pool.query(
      `SELECT box_id, amount, open_tx_hash, opened_at, opened_reward_wei FROM boxes
       WHERE opened = TRUE AND opened_by = $1
       ORDER BY opened_at DESC NULLS LAST, box_id DESC
       LIMIT $2 OFFSET $3`,
      [user.toLowerCase(), limit, offset]
    );
    const items: MyOpenItem[] = dataR.rows.map((row) => ({
      boxId: String(row.box_id),
      amount: row.amount != null ? String(row.amount) : null,
      rewardWei: row.opened_reward_wei != null ? String(row.opened_reward_wei) : null,
      txHash: row.open_tx_hash ?? null,
      openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
    }));
    return { items, total };
  }

  async setChainRegistered(boxId: bigint): Promise<void> {
    await getPool().query(
      "UPDATE boxes SET chain_registered_at = NOW() WHERE box_id = $1",
      [boxId.toString()]
    );
  }

  async getNonce(user: `0x${string}`): Promise<bigint> {
    const r = await getPool().query(
      "SELECT nonce FROM open_nonces WHERE user_address = $1",
      [user.toLowerCase()]
    );
    if (r.rows.length === 0) return 0n;
    return BigInt(r.rows[0].nonce);
  }

  async bumpNonce(user: `0x${string}`): Promise<void> {
    await getPool().query(
      `INSERT INTO open_nonces (user_address, nonce) VALUES ($1, 1)
       ON CONFLICT (user_address) DO UPDATE SET nonce = open_nonces.nonce + 1`,
      [user.toLowerCase()]
    );
  }

  async list(options: ListBoxesOptions): Promise<ListBoxesResult> {
    const pool = getPool();
    const limit = Math.min(Math.max(1, options.limit), 500);
    const offset = Math.max(0, options.offset);

    let where = "";
    const params: unknown[] = [];
    if (options.opened === true) {
      where = " WHERE opened = TRUE";
    } else if (options.opened === false) {
      where = " WHERE opened = FALSE";
    }

    const countR = await pool.query(`SELECT COUNT(*)::int AS n FROM boxes${where}`);
    const total = countR.rows[0]?.n ?? 0;

    const dataR = await pool.query(
      `SELECT box_id, opened, chain_registered_at FROM boxes${where}
       ORDER BY box_id ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const items: BoxListItem[] = dataR.rows.map((row) => ({
      boxId: BigInt(row.box_id),
      opened: row.opened,
      chainCommitmentRegisteredAt: row.chain_registered_at
        ? Math.floor(new Date(row.chain_registered_at).getTime() / 1000)
        : undefined,
    }));

    return { items, total };
  }
}

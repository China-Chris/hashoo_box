export type BoxRecord = {
  boxId: bigint;
  commitment: bigint;
  saltHex: `0x${string}`;
  amount?: bigint;
  /** 开盒成功后 Vault.airdrop(winner, rewardWei)；未设则用 OPEN_REWARD_WEI */
  rewardWei?: bigint;
  tier?: number;
  opened: boolean;
  chainCommitmentRegisteredAt?: number;
  /** set when opened via POST /open */
  openedBy?: `0x${string}`;
  openTxHash?: `0x${string}`;
  openedAt?: number;
};

export type BoxListItem = {
  boxId: bigint;
  opened: boolean;
  /** set when box has chain_registered_at in DB */
  chainCommitmentRegisteredAt?: number;
};

export type ListBoxesOptions = {
  /** true = only opened, false = only unopened, undefined = all */
  opened?: boolean;
  limit: number;
  offset: number;
};

export type ListBoxesResult = {
  items: BoxListItem[];
  total: number;
};

export type MyOpenItem = {
  boxId: string;
  amount: string | null;
  /** 实际发放的 HSK（wei）；有则 My 页格式化为 HSK */
  rewardWei: string | null;
  txHash: string | null;
  openedAt: string | null;
};

export interface BoxStore {
  get(boxId: bigint): Promise<BoxRecord | undefined>;
  /** Optional: list boxes for Mystery Box UI; memory store implements scan */
  list?(options: ListBoxesOptions): Promise<ListBoxesResult>;
  register(record: BoxRecord): Promise<void>;
  /** meta optional: set when opening on behalf of user so My page can list by user；rewardWeiPaid 为 Vault 实际发放 */
  markOpened(
    boxId: bigint,
    meta?: { openedBy: `0x${string}`; txHash: `0x${string}`; rewardWeiPaid?: bigint }
  ): Promise<void>;
  /** boxes opened by user (My page); optional on store */
  listOpensByUser?(
    user: `0x${string}`,
    options: { limit: number; offset: number }
  ): Promise<{ items: MyOpenItem[]; total: number }>;
  getNonce(user: `0x${string}`): Promise<bigint>;
  bumpNonce(user: `0x${string}`): Promise<void>;
  setChainRegistered?(boxId: bigint): Promise<void>;
}

class MemoryBoxStore implements BoxStore {
  private boxes = new Map<string, BoxRecord>();
  private nonces = new Map<string, bigint>();

  async get(boxId: bigint) {
    return this.boxes.get(boxId.toString());
  }
  async register(record: BoxRecord) {
    if (this.boxes.has(record.boxId.toString())) throw new Error("Box already registered");
    this.boxes.set(record.boxId.toString(), { ...record, opened: false });
  }
  async markOpened(
    boxId: bigint,
    meta?: { openedBy: `0x${string}`; txHash: `0x${string}`; rewardWeiPaid?: bigint }
  ) {
    const b = this.boxes.get(boxId.toString());
    if (!b) throw new Error("Box not found");
    b.opened = true;
    if (meta) {
      b.openedBy = meta.openedBy.toLowerCase() as `0x${string}`;
      b.openTxHash = meta.txHash;
      b.openedAt = Math.floor(Date.now() / 1000);
      if (meta.rewardWeiPaid != null) b.rewardWei = meta.rewardWeiPaid;
    }
  }

  async listOpensByUser(
    user: `0x${string}`,
    options: { limit: number; offset: number }
  ): Promise<{ items: MyOpenItem[]; total: number }> {
    const u = user.toLowerCase();
    const opened = [...this.boxes.values()].filter(
      (b) => b.opened && b.openedBy === u
    );
    opened.sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0));
    const total = opened.length;
    const slice = opened.slice(options.offset, options.offset + options.limit);
    const items: MyOpenItem[] = slice.map((b) => ({
      boxId: b.boxId.toString(),
      amount: b.amount != null ? b.amount.toString() : null,
      rewardWei: b.rewardWei != null ? b.rewardWei.toString() : null, // memory: set on markOpened when paid
      txHash: b.openTxHash ?? null,
      openedAt: b.openedAt != null ? new Date(b.openedAt * 1000).toISOString() : null,
    }));
    return { items, total };
  }
  async getNonce(user: `0x${string}`) {
    return this.nonces.get(user.toLowerCase()) ?? 0n;
  }
  async bumpNonce(user: `0x${string}`) {
    const k = user.toLowerCase();
    this.nonces.set(k, (this.nonces.get(k) ?? 0n) + 1n);
  }

  async list(options: ListBoxesOptions): Promise<ListBoxesResult> {
    let items = [...this.boxes.values()].map((b) => ({
      boxId: b.boxId,
      opened: b.opened,
      chainCommitmentRegisteredAt: b.chainCommitmentRegisteredAt,
    }));
    if (options.opened === true) items = items.filter((i) => i.opened);
    if (options.opened === false) items = items.filter((i) => !i.opened);
    items.sort((a, b) => (a.boxId < b.boxId ? -1 : a.boxId > b.boxId ? 1 : 0));
    const total = items.length;
    const slice = items.slice(options.offset, options.offset + options.limit);
    return { items: slice, total };
  }
}

let _store: BoxStore = new MemoryBoxStore();

export function getBoxStore(): BoxStore {
  return _store;
}

export async function initPersistence(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { initDb, PgBoxStore } = await import("./db/pg.js");
  await initDb();
  _store = new PgBoxStore();
}

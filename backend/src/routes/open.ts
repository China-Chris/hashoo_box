import type { FastifyInstance } from "fastify";
import type { Hex } from "viem";
import {
  eip712Domain,
  eip712Types,
  verifyOpenSignature,
  type OpenIntentMessage,
} from "../eip712.js";
import { getBoxStore } from "../db.js";
import {
  isOpenedOnChain,
  submitOpen,
  registerBoxOnChain,
  getRegisteredCommitment,
  getOpenOnChain,
  vaultAirdrop,
} from "../chain.js";
import { config } from "../config.js";
import { proveOpen } from "../prover.js";

type OpenBody = {
  signature: Hex;
  message: {
    boxId: string;
    user: `0x${string}`;
    nonce: string;
    deadline: string;
  };
};

export async function openRoutes(app: FastifyInstance) {
  const store = () => getBoxStore();

  /**
   * List boxes registered in DB with optional opened filter.
   * Query: opened=true | opened=false | omit for all. limit (default 50, max 500), offset (default 0).
   * Register this route before /boxes/:boxId so "boxes" is not captured as boxId.
   */
  app.get("/boxes", async (req, reply) => {
    const q = req.query as { opened?: string; limit?: string; offset?: string };
    let openedFilter: boolean | undefined;
    if (q.opened === "true") openedFilter = true;
    else if (q.opened === "false") openedFilter = false;

    const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? "50", 10) || 50));
    const offset = Math.max(0, parseInt(q.offset ?? "0", 10) || 0);

    const listFn = store().list;
    if (!listFn) {
      return reply.status(501).send({
        error: "List not available",
        detail: "Persistence store has no list(); use Postgres or memory store with list",
      });
    }

    const { items, total } = await listFn({
      opened: openedFilter,
      limit,
      offset,
    });

    return {
      items: items.map((i) => ({
        boxId: i.boxId.toString(),
        opened: i.opened,
        chainRegistered: i.chainCommitmentRegisteredAt != null,
      })),
      total,
      limit,
      offset,
    };
  });

  /**
   * My page: opens performed by this user (DB recorded at POST open).
   * Query: user=0x... required. limit/offset optional.
   */
  app.get("/me/opens", async (req, reply) => {
    const user = (req.query as { user?: string }).user as `0x${string}` | undefined;
    if (!user || !user.startsWith("0x")) {
      return reply.status(400).send({ error: "query user=0x... required" });
    }
    const q = req.query as { limit?: string; offset?: string };
    const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? "50", 10) || 50));
    const offset = Math.max(0, parseInt(q.offset ?? "0", 10) || 0);
    const fn = store().listOpensByUser;
    if (!fn) {
      return reply.status(501).send({ error: "listOpensByUser not available" });
    }
    const { items, total } = await fn(user, { limit, offset });
    return { items, total, limit, offset };
  });

  /** Frontend: get EIP-712 payload for signTypedData */
  app.get("/boxes/:boxId/open-typed-data", async (req, reply) => {
    const boxId = BigInt((req.params as { boxId: string }).boxId);
    const user = (req.query as { user?: string }).user as `0x${string}` | undefined;
    if (!user || !user.startsWith("0x")) {
      return reply.status(400).send({ error: "query user=0x... required" });
    }
    const box = await store().get(boxId);
    if (!box) return reply.status(404).send({ error: "Box not found" });
    if (box.opened) return reply.status(409).send({ error: "Already opened" });

    const nonce = await store().getNonce(user);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    const message: OpenIntentMessage = { boxId, user, nonce, deadline };

    return {
      domain: eip712Domain,
      types: eip712Types,
      primaryType: "OpenIntent" as const,
      message: {
        boxId: message.boxId.toString(),
        user: message.user,
        nonce: message.nonce.toString(),
        deadline: message.deadline.toString(),
      },
    };
  });

  /** Frontend: after user signs, POST here to open on-chain */
  app.post<{ Params: { boxId: string }; Body: OpenBody }>(
    "/boxes/:boxId/open",
    async (req, reply) => {
      const boxId = BigInt(req.params.boxId);
      const { signature, message } = req.body;
      if (!signature || !message) {
        return reply.status(400).send({ error: "signature and message required" });
      }

      const msg: OpenIntentMessage = {
        boxId: BigInt(message.boxId),
        user: message.user,
        nonce: BigInt(message.nonce),
        deadline: BigInt(message.deadline),
      };

      if (msg.boxId !== boxId) return reply.status(400).send({ error: "boxId mismatch" });
      if (BigInt(Math.floor(Date.now() / 1000)) > msg.deadline) {
        return reply.status(400).send({ error: "Signature expired" });
      }

      try {
        await verifyOpenSignature(msg, signature);
      } catch {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      if ((await store().getNonce(msg.user)) !== msg.nonce) {
        return reply.status(400).send({ error: "Nonce mismatch — fetch fresh typed data" });
      }

      const box = await store().get(boxId);
      if (!box) return reply.status(404).send({ error: "Box not found" });
      if (box.opened) return reply.status(409).send({ error: "Already opened" });

      // 3C: if chain has registered commitment, must match DB
      const reg = await getRegisteredCommitment(boxId);
      if (reg !== 0n && reg !== box.commitment) {
        return reply.status(409).send({ error: "Commitment mismatch with chain registration" });
      }

      if (await isOpenedOnChain(boxId)) {
        await store().markOpened(boxId); // sync state; no user row if opened elsewhere
        return reply.status(409).send({ error: "Already opened on chain" });
      }

      let proofBytes: Hex;
      try {
        proofBytes = await proveOpen(box);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return reply.status(501).send({ error: "Prover not ready", detail: m });
      }

      try {
        const txHash = await submitOpen(boxId, msg.user, proofBytes, box.commitment);
        await store().markOpened(boxId, { openedBy: msg.user, txHash });
        await store().bumpNonce(msg.user);
        // 可选：开盒成功后从 Vault 发 HSK。优先级：rewardWei > amount(1..10)×1e18 > OPEN_REWARD_WEI
        // amount 与电路 witness 一致；1–10 表示发 1–10 枚 HSK（wei = amount * 10^18）
        const WAD = 10n ** 18n;
        let prizeWei = box.rewardWei ?? 0n;
        if (prizeWei === 0n && box.amount != null && box.amount >= 1n && box.amount <= 10n) {
          prizeWei = box.amount * WAD;
        }
        if (prizeWei === 0n) prizeWei = config.openRewardWei;

        let rewardWeiPaid = 0n;
        let airdropError: string | undefined;
        if (prizeWei > 0n && config.vaultAddress) {
          try {
            await vaultAirdrop(msg.user, prizeWei);
            rewardWeiPaid = prizeWei;
            if (store().markOpened && rewardWeiPaid > 0n) {
              await store().markOpened(boxId, {
                openedBy: msg.user,
                txHash,
                rewardWeiPaid,
              });
            }
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            airdropError = m;
            app.log.warn({ boxId: boxId.toString(), user: msg.user, err: m }, "Vault airdrop failed after submitOpen");
          }
        } else if (prizeWei > 0n && !config.vaultAddress) {
          airdropError = "VAULT_ADDRESS not set";
        } else if (prizeWei === 0n) {
          airdropError =
            "No prize configured: set OPEN_REWARD_WEI or register box with amount 1–10 / rewardWei";
        }
        return {
          txHash,
          boxId: boxId.toString(),
          rewardWei: rewardWeiPaid > 0n ? rewardWeiPaid.toString() : undefined,
          ...(airdropError && rewardWeiPaid === 0n ? { airdropError } : {}),
        };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return reply.status(500).send({ error: "submitOpen failed", detail: m });
      }
    }
  );

  /**
   * Register box (mint/listing). If REGISTER_ON_CHAIN=1, calls BlindBoxZK.registerBox after DB insert.
   * Frontend does not call this with salt — only backend/admin after mint.
   */
  app.post<{
    Body: {
      boxId: string;
      commitment: string;
      saltHex: `0x${string}`;
      amount?: string;
      /** 开盒成功后 airdrop 的 wei；不配则看 OPEN_REWARD_WEI */
      rewardWei?: string;
      tier?: number;
      registerOnChain?: boolean;
    };
  }>("/internal/register-box", async (req, reply) => {
    const b = req.body;
    if (!b?.boxId || !b?.commitment || !b?.saltHex) {
      return reply.status(400).send({ error: "boxId, commitment, saltHex required" });
    }
    const boxId = BigInt(b.boxId);
    const commitment = BigInt(b.commitment);
    try {
      await store().register({
        boxId,
        commitment,
        saltHex: b.saltHex,
        amount: b.amount ? BigInt(b.amount) : undefined,
        rewardWei: b.rewardWei ? BigInt(b.rewardWei) : undefined,
        tier: b.tier,
        opened: false,
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return reply.status(400).send({ error: m });
    }

    const doChain =
      b.registerOnChain === true || process.env.REGISTER_ON_CHAIN === "1";
    if (doChain) {
      try {
        const txHash = await registerBoxOnChain(boxId, commitment);
        if (store().setChainRegistered) await store().setChainRegistered!(boxId);
        return { ok: true, boxId: b.boxId, registerTxHash: txHash };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return reply.status(500).send({ error: "registerBox on-chain failed", detail: m });
      }
    }
    return { ok: true, boxId: b.boxId };
  });

  /**
   * 链上已开盒时返回 getOpen 摘要（commitment / timestamp / user / proof 字节长），供 My 页「链上证明」展示。
   * 未开盒或 RPC 失败返回 404 / 空。
   */
  app.get("/boxes/:boxId/chain-open", async (req, reply) => {
    const boxId = BigInt((req.params as { boxId: string }).boxId);
    const data = await getOpenOnChain(boxId);
    if (!data) return reply.status(404).send({ error: "Not opened on chain or RPC error" });
    return { boxId: boxId.toString(), ...data };
  });

  /** Frontend: read-only status for UI */
  app.get("/boxes/:boxId/status", async (req, reply) => {
    const boxId = BigInt((req.params as { boxId: string }).boxId);
    const box = await store().get(boxId);
    if (!box) return reply.status(404).send({ error: "Box not found" });
    let chainOpened = false;
    let chainCommitment: string | null = null;
    try {
      chainOpened = await isOpenedOnChain(boxId);
      const c = await getRegisteredCommitment(boxId);
      if (c !== 0n) chainCommitment = c.toString();
    } catch {
      // RPC down
    }
    return {
      boxId: boxId.toString(),
      opened: box.opened || chainOpened,
      chainRegistered: chainCommitment !== null,
      chainCommitment,
    };
  });
}

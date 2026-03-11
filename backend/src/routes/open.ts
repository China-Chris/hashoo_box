import type { FastifyInstance } from "fastify";
import type { Hex } from "viem";
import {
  eip712Domain,
  eip712Types,
  verifyOpenSignature,
  type OpenIntentMessage,
} from "../eip712.js";
import { boxStore } from "../db.js";
import { isOpenedOnChain, submitOpen } from "../chain.js";
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
  /** Frontend asks for typed data to sign */
  app.get("/boxes/:boxId/open-typed-data", async (req, reply) => {
    const boxId = BigInt((req.params as { boxId: string }).boxId);
    const user = (req.query as { user?: string }).user as `0x${string}` | undefined;
    if (!user || !user.startsWith("0x")) {
      return reply.status(400).send({ error: "query user=0x... required" });
    }
    const box = boxStore.get(boxId);
    if (!box) return reply.status(404).send({ error: "Box not found" });
    if (box.opened) return reply.status(409).send({ error: "Already opened" });

    const nonce = boxStore.getNonce(user);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 min

    const message: OpenIntentMessage = {
      boxId,
      user,
      nonce,
      deadline,
    };

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

  /** User signs OpenIntent; backend proves + submitOpen */
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

      if (msg.boxId !== boxId) {
        return reply.status(400).send({ error: "boxId mismatch" });
      }
      if (BigInt(Math.floor(Date.now() / 1000)) > msg.deadline) {
        return reply.status(400).send({ error: "Signature expired" });
      }

      try {
        await verifyOpenSignature(msg, signature);
      } catch {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      if (boxStore.getNonce(msg.user) !== msg.nonce) {
        return reply.status(400).send({ error: "Nonce mismatch — fetch fresh typed data" });
      }

      const box = boxStore.get(boxId);
      if (!box) return reply.status(404).send({ error: "Box not found" });
      if (box.opened) return reply.status(409).send({ error: "Already opened" });

      if (await isOpenedOnChain(boxId)) {
        boxStore.markOpened(boxId);
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
        boxStore.markOpened(boxId);
        boxStore.bumpNonce(msg.user);
        return { txHash, boxId: boxId.toString() };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return reply.status(500).send({ error: "submitOpen failed", detail: m });
      }
    }
  );

  /** Dev only: register a box (mint/listing simulation) */
  app.post<{
    Body: {
      boxId: string;
      commitment: string;
      saltHex: `0x${string}`;
      amount?: string;
      tier?: number;
    };
  }>("/dev/register-box", async (req, reply) => {
    const b = req.body;
    if (!b?.boxId || !b?.commitment || !b?.saltHex) {
      return reply.status(400).send({ error: "boxId, commitment, saltHex required" });
    }
    try {
      boxStore.register({
        boxId: BigInt(b.boxId),
        commitment: BigInt(b.commitment),
        saltHex: b.saltHex,
        amount: b.amount ? BigInt(b.amount) : undefined,
        tier: b.tier,
        opened: false,
      });
      return { ok: true, boxId: b.boxId };
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return reply.status(400).send({ error: m });
    }
  });
}

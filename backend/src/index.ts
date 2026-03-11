import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { publicClient } from "./chain.js";
import { initPersistence } from "./db.js";
import { openRoutes } from "./routes/open.js";

await initPersistence();

const app = Fastify({ logger: true });

// 浏览器从 localhost:3000 请求 localhost:3001 必须带 CORS，否则 fetch 报 Failed to fetch
await app.register(cors, {
  origin: true, // 开发可放开；生产建议改为固定列表或 CORS_ORIGIN 环境变量
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

app.get("/health", async () => {
  const base = {
    ok: true,
    chainId: config.chainId,
    persistence: process.env.DATABASE_URL ? "postgres" : "memory",
    blindBoxAddress: config.blindBoxAddress,
    vaultAddress: config.vaultAddress ?? null,
    /** 未配盒子上 amount/rewardWei 时的默认发放 wei；0 表示不会用默认值发 */
    openRewardWei: config.openRewardWei > 0n ? config.openRewardWei.toString() : null,
  };
  if (!config.vaultAddress) return { ...base, vaultBalanceWei: null };
  try {
    const vaultBalanceWei = await publicClient.getBalance({
      address: config.vaultAddress,
    });
    return {
      ...base,
      vaultBalanceWei: vaultBalanceWei.toString(),
      /** 若 vaultBalanceWei 小于即将发放的 prizeWei，airdrop 会失败，opened_reward_wei 不会写入 */
    };
  } catch {
    return { ...base, vaultBalanceWei: null };
  }
});

await app.register(openRoutes);

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`BlindBox backend http://${host}:${port}`);
} catch (e) {
  app.log.error(e);
  process.exit(1);
}

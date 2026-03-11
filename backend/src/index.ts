import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
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

app.get("/health", async () => ({
  ok: true,
  chainId: config.chainId,
  persistence: process.env.DATABASE_URL ? "postgres" : "memory",
  /** 前端 My 页「链上证明」展示与 Explorer 链接用 */
  blindBoxAddress: config.blindBoxAddress,
  vaultAddress: config.vaultAddress ?? null,
}));

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

import Fastify from "fastify";
import { config } from "./config.js";
import { openRoutes } from "./routes/open.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, chainId: config.chainId }));

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

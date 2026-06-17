import { createServer } from "node:http";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import { createApp } from "./http/app.js";
import { closeDb } from "./infrastructure/postgres/pool.js";
import { startMarketTickListener } from "./infrastructure/postgres/tick-listener.js";
import { closeRedis, connectRedis, redisSubscriber } from "./infrastructure/redis/client.js";
import { tickChannel } from "./modules/market/services/ticks.service.js";
import { startSimulator } from "./modules/simulator/services/simulator.service.js";

async function main() {
  await connectRedis();
  await redisSubscriber.subscribe(tickChannel());

  const app = createApp();
  const server = createServer(app);
  const stopMarketTickListener = startMarketTickListener();
  const stopSimulator = startSimulator();

  server.listen(config.API_PORT, () => {
    logger.info({ port: config.API_PORT }, "WingFin API listening");
  });

  const shutdown = async () => {
    logger.info("Shutting down API");
    stopSimulator();
    await stopMarketTickListener();
    server.close();
    await closeRedis();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main().catch((error) => {
  logger.error(error, "API failed to start");
  process.exit(1);
});

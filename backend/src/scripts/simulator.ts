import { closeRedis, connectRedis, redisSubscriber } from "../infrastructure/redis/client.js";
import { tickChannel } from "../modules/market/services/ticks.service.js";
import { startSimulator } from "../modules/simulator/services/simulator.service.js";

await connectRedis();
await redisSubscriber.subscribe(tickChannel());
const stop = startSimulator();
console.log("Simulator running. Press Ctrl+C to stop.");

process.on("SIGINT", () => {
  void (async () => {
    stop();
    await closeRedis();
    process.exit(0);
  })();
});

import { Redis } from "ioredis";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export const redisPublisher = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
export const redisSubscriber = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

redisPublisher.on("error", (error) => logger.error({ error }, "Redis publisher error"));
redisSubscriber.on("error", (error) => logger.error({ error }, "Redis subscriber error"));

export async function connectRedis() {
  await Promise.all([redisPublisher.connect(), redisSubscriber.connect()]);
}

export async function closeRedis() {
  await Promise.allSettled([redisPublisher.quit(), redisSubscriber.quit()]);
}

export function redisStatus() {
  return {
    publisher: redisPublisher.status,
    subscriber: redisSubscriber.status
  };
}

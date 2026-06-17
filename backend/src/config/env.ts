import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default("postgres://wingfin:wingfin@localhost:5432/wingfin"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:8080"),
  MARKET_TIMEZONE: z.string().default("Asia/Dhaka"),
  MARKET_OPEN_TIME: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().regex(/^\d{2}:\d{2}$/)
  ).catch("10:00"),
  MARKET_CLOSE_TIME: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().regex(/^\d{2}:\d{2}$/)
  ).catch("14:30"),
  MARKET_STATUS_OVERRIDE: z.enum(["auto", "open", "closed"]).default("auto"),
  DEFAULT_INDEX_SYMBOL: z.string().default("DSEX"),
  DEFAULT_STOCK_SYMBOL: z.string().default("GP"),
  SIMULATOR_ENABLED: z.coerce.boolean().default(false)
});

export const config = envSchema.parse(process.env);

export const corsOrigins = config.CORS_ORIGIN.split(",").map((origin) => origin.trim());

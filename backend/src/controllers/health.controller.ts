import type { Request, Response } from "express";
import { redisStatus } from "../infrastructure/redis/client.js";

interface HealthResponseDto {
  ok: boolean;
  service: string;
  redis: ReturnType<typeof redisStatus>;
}

/**
 * @openapi
 * /health:
 *   get:
 *     responses:
 *       200:
 *         description: API health
 */
export function getHealth(_req: Request, res: Response<HealthResponseDto>) {
  res.json({ ok: true, service: "wingsfin-api", redis: redisStatus() });
}

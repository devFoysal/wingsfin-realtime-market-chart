import type { NextFunction, Request, Response } from "express";
import type { SimulateTickDto, TickResponseDto } from "../dtos/market.dto.js";
import { simulateTickSchema } from "../modules/market/schemas.js";
import { storeTick } from "../modules/market/ticks.service.js";

export async function createSimulatedTick(
  req: Request<unknown, TickResponseDto, SimulateTickDto>,
  res: Response<TickResponseDto>,
  next: NextFunction
) {
  try {
    const payload = simulateTickSchema.parse(req.body);
    const tick = await storeTick(payload);
    res.status(201).json({ tick });
  } catch (error) {
    next(error);
  }
}

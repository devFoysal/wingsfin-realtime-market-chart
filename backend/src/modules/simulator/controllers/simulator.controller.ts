import type { NextFunction, Request, Response } from "express";
import type { SimulateTickDto, TickResponseDto } from "../../market/dtos/market.dto.js";
import { simulateTickSchema } from "../../market/schemas/market.schema.js";
import { storeTick } from "../../market/services/ticks.service.js";

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

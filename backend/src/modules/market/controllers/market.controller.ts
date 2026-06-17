import type { NextFunction, Request, Response } from "express";
import type { InstrumentsResponseDto, MarketStatusDto } from "../dtos/market.dto.js";
import { getMarketSession } from "../services/session.service.js";
import { listInstruments } from "../services/instruments.service.js";

/**
 * @openapi
 * /api/market/status:
 *   get:
 *     responses:
 *       200:
 *         description: Current market status
 */
export function getMarketStatus(_req: Request, res: Response<MarketStatusDto>) {
  const session = getMarketSession();
  res.json({
    status: session.status,
    isOpen: session.isOpen,
    timezone: session.now.zoneName,
    open: session.open.toISO(),
    close: session.close.toISO(),
    now: session.now.toISO()
  });
}

export async function getInstruments(_req: Request, res: Response<InstrumentsResponseDto>, next: NextFunction) {
  try {
    res.json({ instruments: await listInstruments() });
  } catch (error) {
    next(error);
  }
}

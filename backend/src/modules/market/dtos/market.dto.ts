import type { ChartPoint, Instrument, InstrumentType, Tick } from "../types/market.types.js";
import type { z } from "zod";
import type { chartQuerySchema, simulateTickSchema } from "../schemas/market.schema.js";

export type ChartQueryDto = z.infer<typeof chartQuerySchema>;
export type SimulateTickDto = z.infer<typeof simulateTickSchema>;

export interface MarketStatusDto {
  status: "OPEN" | "CLOSED";
  isOpen: boolean;
  timezone: string | null;
  open: string | null;
  close: string | null;
  now: string | null;
}

export interface InstrumentsResponseDto {
  instruments: Instrument[];
}

export interface ChartHistoryDto {
  instrument: Instrument;
  market: {
    status: "OPEN" | "CLOSED";
    timezone: string | null;
    open: string | null;
    close: string | null;
    now: string | null;
  };
  points: ChartPoint[];
  latest: ChartPoint;
  referenceValue: number;
}

export interface TickResponseDto {
  tick: Tick;
}

export type MarketStreamEventDto =
  | { event: "tick"; data: Tick }
  | { event: "invalidate"; data: { type: InstrumentType; symbol: string; reason: string } };

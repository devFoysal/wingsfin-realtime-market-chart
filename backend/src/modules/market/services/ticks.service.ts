import { DateTime } from "luxon";
import { db } from "../../../db/client.js";
import { marketTicks } from "../../../db/schema.js";
import type { MarketStreamEventDto } from "../dtos/market.dto.js";
import { redisPublisher } from "../../../infrastructure/redis/client.js";
import { indexPayloadSchema, stockPayloadSchema } from "../schemas/market.schema.js";
import type { InstrumentType, Tick } from "../types/market.types.js";
import { getInstrument } from "./instruments.service.js";

const TICK_CHANNEL = "market:ticks";
const LATEST_TICK_TTL_SECONDS = 60 * 60 * 6;

export type MarketStreamEvent = MarketStreamEventDto;

export function tickChannel() {
  return TICK_CHANNEL;
}

export function normalizePayload(payload: unknown, fallbackYesterdayClose?: number) {
  const indexParsed = indexPayloadSchema.safeParse(payload);
  if (indexParsed.success) {
    const value = indexParsed.data.capital_value;
    return {
      type: "index" as const,
      symbol: indexParsed.data.index_id,
      time: DateTime.fromMillis(indexParsed.data.time).toUTC().toISO()!,
      value,
      yesterdayClose: fallbackYesterdayClose ?? value
    };
  }

  const stockParsed = stockPayloadSchema.safeParse(payload);
  if (stockParsed.success) {
    return {
      type: "stock" as const,
      symbol: stockParsed.data.trade_code,
      time: DateTime.fromMillis(stockParsed.data.time).toUTC().toISO()!,
      value: stockParsed.data.close_price,
      yesterdayClose: stockParsed.data.yesterday_close_price
    };
  }

  throw new Error("Payload is neither a valid index update nor a valid stock update");
}

export async function storeTick(payload: unknown): Promise<Tick> {
  const preliminary = normalizePayload(payload);
  const instrument = await getInstrument(preliminary.type, preliminary.symbol);
  if (!instrument) {
    throw Object.assign(new Error(`Unknown instrument ${preliminary.type}:${preliminary.symbol}`), { statusCode: 404 });
  }

  const normalized = normalizePayload(payload, instrument.yesterdayClose);
  const [row] = await db
    .insert(marketTicks)
    .values({
      instrumentId: instrument.id,
      time: new Date(normalized.time),
      value: normalized.value,
      yesterdayClose: normalized.yesterdayClose,
      sourcePayload: payload
    })
    .returning({
      time: marketTicks.time,
      value: marketTicks.value,
      yesterdayClose: marketTicks.yesterdayClose
    });

  const tick: Tick = {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    type: instrument.type,
    time: row.time.toISOString(),
    value: row.value,
    yesterdayClose: row.yesterdayClose
  };

  return tick;
}

export async function publishTick(tick: Tick) {
  const serializedTick = JSON.stringify({ event: "tick", data: tick } satisfies MarketStreamEvent);
  await redisPublisher
    .multi()
    .set(`market:latest:${tick.type}:${tick.symbol}`, JSON.stringify(tick), "EX", LATEST_TICK_TTL_SECONDS)
    .publish(TICK_CHANNEL, serializedTick)
    .exec();
}

export async function publishInvalidation(type: InstrumentType, symbol: string, reason: string) {
  await redisPublisher.publish(
    TICK_CHANNEL,
    JSON.stringify({ event: "invalidate", data: { type, symbol, reason } } satisfies MarketStreamEvent)
  );
}

export function tickToSourcePayload(type: InstrumentType, symbol: string, time: number, value: number, yesterdayClose: number) {
  if (type === "index") {
    return {
      index_id: symbol,
      time,
      capital_value: Number(value.toFixed(2)),
      percentage_change_from_yesterday_close_value: Number((((value - yesterdayClose) / yesterdayClose) * 100).toFixed(2))
    };
  }

  return {
    trade_code: symbol,
    time,
    close_price: Number(value.toFixed(2)),
    yesterday_close_price: yesterdayClose
  };
}

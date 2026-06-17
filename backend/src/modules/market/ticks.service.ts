import { DateTime } from "luxon";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { instruments, marketTicks, type InstrumentRow } from "../../db/schema.js";
import type { ChartHistoryDto, MarketStreamEventDto } from "../../dtos/market.dto.js";
import { redisPublisher } from "../../infrastructure/redis/client.js";
import { latestVisibleMinute, marketTimeline, minuteFloor, type MarketSession } from "./market-session.js";
import { indexPayloadSchema, stockPayloadSchema } from "./schemas.js";
import type { ChartPoint, Instrument, InstrumentType, Tick } from "./types.js";

const TICK_CHANNEL = "market:ticks";
const LATEST_TICK_TTL_SECONDS = 60 * 60 * 6;

export type MarketStreamEvent = MarketStreamEventDto;

export function tickChannel() {
  return TICK_CHANNEL;
}

function rowToInstrument(row: InstrumentRow): Instrument {
  return {
    id: row.id,
    symbol: row.symbol,
    type: row.type,
    displayName: row.displayName,
    yesterdayClose: row.yesterdayClose
  };
}

export async function listInstruments() {
  const rows = await db
    .select()
    .from(instruments)
    .orderBy(asc(instruments.type), asc(instruments.symbol));
  return rows.map(rowToInstrument);
}

export async function getInstrument(type: InstrumentType, symbol: string) {
  const [row] = await db
    .select()
    .from(instruments)
    .where(and(eq(instruments.type, type), eq(instruments.symbol, symbol)))
    .limit(1);
  return row ? rowToInstrument(row) : null;
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

function pointColor(value: number | null, reference: number): ChartPoint["color"] {
  if (value === null || value === reference) return "#EE27F5";
  return value > reference ? "#7327F5" : "#F52738";
}

export function buildGaplessSeries(args: {
  session: MarketSession;
  ticks: Array<{ time: string | Date; value: number }>;
  yesterdayClose: number;
}) {
  const byMinute = new Map<string, { time: DateTime; value: number }>();
  for (const tick of args.ticks) {
    const tickTime = DateTime.fromJSDate(new Date(tick.time)).setZone(args.session.now.zoneName ?? "UTC");
    const minute = minuteFloor(tickTime);
    const key = minute.toISO()!;
    const previous = byMinute.get(key);
    if (!previous || tickTime > previous.time) {
      byMinute.set(key, { time: tickTime, value: Number(tick.value) });
    }
  }

  const latestMinute = latestVisibleMinute(args.session);
  let carriedValue: number | null = null;

  return marketTimeline(args.session).map<ChartPoint>((minute) => {
    const key = minute.toISO()!;
    const tick = byMinute.get(key);
    if (tick) carriedValue = tick.value;
    const isFuture = minute > latestMinute;
    const value = isFuture ? null : carriedValue;

    return {
      minute: key,
      value,
      carried: !tick && value !== null,
      isLatest: minute.toMillis() === latestMinute.toMillis(),
      color: pointColor(value, args.yesterdayClose)
    };
  });
}

export async function getHistory(type: InstrumentType, symbol: string, session: MarketSession): Promise<ChartHistoryDto> {
  const instrument = await getInstrument(type, symbol);
  if (!instrument) {
    throw Object.assign(new Error(`Unknown instrument ${type}:${symbol}`), { statusCode: 404 });
  }

  const rows = await db
    .select({ time: marketTicks.time, value: marketTicks.value })
    .from(marketTicks)
    .where(
      and(
        eq(marketTicks.instrumentId, instrument.id),
        gte(marketTicks.time, session.open.toUTC().toJSDate()),
        lte(marketTicks.time, latestVisibleMinute(session).toUTC().toJSDate())
      )
    )
    .orderBy(asc(marketTicks.time));

  const points = buildGaplessSeries({
    session,
    ticks: rows.map((row) => ({ time: row.time, value: row.value })),
    yesterdayClose: instrument.yesterdayClose
  });

  return {
    instrument,
    market: {
      status: session.status,
      timezone: session.now.zoneName,
      open: session.open.toISO(),
      close: session.close.toISO(),
      now: session.now.toISO()
    },
    points,
    latest: points.find((point) => point.isLatest) ?? points[0],
    referenceValue: instrument.yesterdayClose
  };
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

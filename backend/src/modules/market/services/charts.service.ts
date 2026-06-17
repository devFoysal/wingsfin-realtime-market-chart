import { DateTime } from "luxon";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { marketTicks } from "../../../db/schema.js";
import type { ChartHistoryDto } from "../dtos/market.dto.js";
import { latestVisibleMinute, marketTimeline, minuteFloor, type MarketSession } from "./session.service.js";
import type { ChartPoint, InstrumentType } from "../types/market.types.js";
import { getInstrument } from "./instruments.service.js";

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

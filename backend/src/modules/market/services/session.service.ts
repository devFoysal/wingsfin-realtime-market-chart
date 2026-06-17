import { DateTime } from "luxon";
import { config } from "../../../config/env.js";

export interface MarketSession {
  now: DateTime;
  open: DateTime;
  close: DateTime;
  isOpen: boolean;
  status: "OPEN" | "CLOSED";
}

function applyClock(base: DateTime, hhmm: string) {
  const [hour, minute] = hhmm.split(":").map(Number);
  return base.set({ hour, minute, second: 0, millisecond: 0 });
}

export function getMarketSession(
  now = DateTime.now().setZone(config.MARKET_TIMEZONE),
): MarketSession {
  const zonedNow = now.setZone(config.MARKET_TIMEZONE);
  const open = applyClock(zonedNow, config.MARKET_OPEN_TIME);
  const close = applyClock(zonedNow, config.MARKET_CLOSE_TIME);
  const timeOpen = zonedNow >= open && zonedNow <= close;
  const isOpen =
    config.MARKET_STATUS_OVERRIDE === "open"
      ? true
      : config.MARKET_STATUS_OVERRIDE === "closed"
        ? false
        : timeOpen;

  return {
    now: zonedNow,
    open,
    close,
    isOpen,
    status: isOpen ? "OPEN" : "CLOSED",
  };
}

export function minuteFloor(value: DateTime) {
  return value.set({ second: 0, millisecond: 0 });
}

export function marketTimeline(session = getMarketSession()) {
  const points: DateTime[] = [];
  let cursor = session.open;
  while (cursor <= session.close) {
    points.push(cursor);
    cursor = cursor.plus({ minutes: 1 });
  }
  return points;
}

export function latestVisibleMinute(session = getMarketSession()) {
  if (session.now < session.open) return session.open;
  if (session.now > session.close) return session.close;
  return minuteFloor(session.now);
}

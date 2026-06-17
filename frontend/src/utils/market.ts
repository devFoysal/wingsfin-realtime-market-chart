import type { ChartPoint, HistoryResponse, MarketInfo, Tick, InstrumentType } from "../dtos/market";
import { minuteKey } from "./time";

export const defaultSymbols: Record<InstrumentType, string> = {
  index: "DSEX",
  stock: "GP"
};

export function pointColor(value: number | null, reference: number): ChartPoint["color"] {
  if (value === null || value === reference) return "#EE27F5";
  return value > reference ? "#7327F5" : "#F52738";
}

export function applyLiveTick(history: HistoryResponse, tick: Tick): HistoryResponse {
  if (history.instrument.symbol !== tick.symbol || history.instrument.type !== tick.type) return history;

  const tickMinute = minuteKey(tick.time);
  let matched = false;
  const points = history.points.map((point: ChartPoint) => {
    const isTickMinute = minuteKey(point.minute) === tickMinute;
    if (!isTickMinute) return { ...point, isLatest: false };
    matched = true;
    return {
      ...point,
      value: tick.value,
      carried: false,
      isLatest: true,
      color: pointColor(tick.value, history.referenceValue)
    };
  });

  if (!matched) return history;
  const latest = points.find((point: ChartPoint) => point.isLatest) ?? history.latest;
  return { ...history, points, latest };
}

export function shouldReloadForMarketUpdate(history: HistoryResponse, market: MarketInfo) {
  return (
    history.market.status !== market.status ||
    history.market.open !== market.open ||
    history.market.close !== market.close ||
    history.market.timezone !== market.timezone
  );
}

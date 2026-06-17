import type { HistoryResponse, InstrumentType, MarketInfo } from "../types/market";
import { request } from "../../../utils/api-client";

export function fetchHistory(type: InstrumentType, symbol: string) {
  return request<HistoryResponse>(`/charts/history?type=${type}&symbol=${encodeURIComponent(symbol)}`);
}

export function fetchMarketStatus() {
  return request<MarketInfo>("/market/status");
}

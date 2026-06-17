import { useQuery } from "@tanstack/react-query";
import type { HistoryResponse, InstrumentType, MarketInfo } from "../dtos/market";
import { request } from "./api-client";
import { defaultSymbols } from "../utils/market";

export const marketKeys = {
  all: ["market"] as const,
  history: (type: InstrumentType) => [...marketKeys.all, "history", type] as const,
  status: () => [...marketKeys.all, "status"] as const,
};

function fetchHistory(type: InstrumentType, symbol: string) {
  return request<HistoryResponse>(`/charts/history?type=${type}&symbol=${encodeURIComponent(symbol)}`);
}

function fetchMarketStatus() {
  return request<MarketInfo>("/market/status");
}

export const marketApi = {
  useGetMarketHistoryQuery: (chartType: InstrumentType) => {
    return useQuery<HistoryResponse>({
      queryKey: marketKeys.history(chartType),
      queryFn: () => fetchHistory(chartType, defaultSymbols[chartType])
    });
  },
  useGetMarketStatusQuery: () => {
    return useQuery<MarketInfo>({
      queryKey: marketKeys.status(),
      queryFn: fetchMarketStatus,
      refetchInterval: 15_000
    });
  }
};

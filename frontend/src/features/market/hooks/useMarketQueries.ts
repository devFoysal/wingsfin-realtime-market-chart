import { useQuery } from "@tanstack/react-query";
import { fetchHistory, fetchMarketStatus } from "../api/marketApi";
import { defaultSymbols } from "../utils/market";
import type { HistoryResponse, InstrumentType, MarketInfo } from "../types/market";

export function useMarketHistory(chartType: InstrumentType) {
  return useQuery<HistoryResponse>({
    queryKey: ["history", chartType],
    queryFn: () => fetchHistory(chartType, defaultSymbols[chartType])
  });
}

export function useMarketStatus() {
  return useQuery<MarketInfo>({
    queryKey: ["market-status"],
    queryFn: fetchMarketStatus,
    refetchInterval: 15_000
  });
}

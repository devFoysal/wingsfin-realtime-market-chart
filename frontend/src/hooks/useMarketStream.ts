import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InstrumentType, Tick, HistoryResponse } from "../dtos/market";
import { marketKeys } from "../services/marketApi";
import { applyLiveTick, defaultSymbols } from "../utils/market";
import { streamUrl } from "../services/api-client";

export function useMarketStream(args: {
  chartType: InstrumentType;
  isOpen: boolean;
}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [liveTicks, setLiveTicks] = useState<Tick[]>([]);

  useEffect(() => {
    setLiveTicks([]);
  }, [args.chartType]);

  useEffect(() => {
    if (!args.isOpen) return undefined;

    const source = new EventSource(streamUrl(args.chartType, defaultSymbols[args.chartType]));
    source.addEventListener("ready", () => setConnected(true));
    source.addEventListener("tick", (event) => {
      try {
        const tick = JSON.parse((event as MessageEvent<string>).data) as Tick;
        setLiveTicks((current) => [tick, ...current].slice(0, 8));
        queryClient.setQueryData<HistoryResponse>(marketKeys.history(args.chartType), (current) => {
          if (!current) return current;
          const next = applyLiveTick(current, tick);
          if (next === current) {
            window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: marketKeys.history(args.chartType) }), 0);
          }
          return next;
        });
      } catch {
        void queryClient.invalidateQueries({ queryKey: marketKeys.history(args.chartType) });
      }
    });
    source.addEventListener("invalidate", () => {
      void queryClient.invalidateQueries({ queryKey: marketKeys.history(args.chartType) });
    });
    source.addEventListener("market-change", () => {
      void queryClient.invalidateQueries({ queryKey: marketKeys.history(args.chartType) });
    });
    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [args.chartType, args.isOpen, queryClient]);

  return { connected, liveTicks, setConnected };
}

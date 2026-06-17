import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MarketChart } from "./features/market/MarketChart";
import type { ChartVariant } from "./features/market/MarketChart";
import type { InstrumentType } from "./dtos/market";
import { marketApi } from "./services/marketApi";
import { useMarketStream } from "./hooks/useMarketStream";
import { useQueryErrorToast } from "./hooks/useQueryErrorToast";
import { useThemeMode } from "./hooks/useThemeMode";
import { defaultSymbols } from "./utils/market";

export default function App() {
  const queryClient = useQueryClient();
  const [chartType, setChartType] = useState<InstrumentType>("index");
  const [chartVariant, setChartVariant] = useState<ChartVariant>("area");
  const { themeMode, setThemeMode } = useThemeMode();
  const historyQuery = marketApi.useGetMarketHistoryQuery(chartType);
  const marketQuery = marketApi.useGetMarketStatusQuery();
  const { connected, liveTicks } = useMarketStream({
    chartType,
    isOpen: marketQuery.data?.status === "OPEN"
  });

  useQueryErrorToast(queryClient);

  const data = historyQuery.data ?? null;

  useEffect(() => {
    if (!marketQuery.data) return;
    void queryClient.invalidateQueries({ queryKey: ["history", chartType] });
  }, [chartType, marketQuery.data, queryClient]);

  const errorMessage = useMemo(() => {
    const historyError = historyQuery.error instanceof Error ? historyQuery.error.message : null;
    const marketError = marketQuery.error instanceof Error ? marketQuery.error.message : null;
    return historyError ?? marketError;
  }, [historyQuery.error, marketQuery.error]);

  if (historyQuery.isError || marketQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-lg rounded-lg bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-5 w-5 text-[#F52738]" />
            Market data connection problem
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The chart could not load from the API. Please check that Docker services are running, then retry.
          </p>
          <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{errorMessage}</p>
          <button
            className="mt-4 text-sm font-medium text-primary underline"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["history", chartType] });
              void queryClient.invalidateQueries({ queryKey: ["market-status"] });
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !marketQuery.data) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading market session...</div>;
  }

  if (marketQuery.data.status === "CLOSED") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-lg rounded-lg bg-card p-5 text-center text-card-foreground shadow-sm">
          <h1 className="text-xl font-semibold">Market is closed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Charts are available only during the configured market session.
          </p>
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Session: {new Date(marketQuery.data.open).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}-
            {new Date(marketQuery.data.close).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {marketQuery.data.timezone}
          </p>
          <button
            className="mt-4 text-sm font-medium text-primary underline"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["market-status"] });
              void queryClient.invalidateQueries({ queryKey: ["history", chartType] });
            }}
          >
            Check again
          </button>
        </div>
      </div>
    );
  }

  return (
    <MarketChart
      chartType={chartType}
      onChartTypeChange={setChartType}
      chartVariant={chartVariant}
      onChartVariantChange={setChartVariant}
      themeMode={themeMode}
      onThemeModeChange={setThemeMode}
      data={data}
      connected={connected}
      liveTicks={liveTicks}
      lastTick={liveTicks[0] ?? null}
      onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["history", chartType] })}
      currentSymbol={defaultSymbols[chartType]}
    />
  );
}

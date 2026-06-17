import ReactECharts from "echarts-for-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartArea,
  ChartLine,
  Clock3,
  Moon,
  Radio,
  RefreshCcw,
  Signal,
  Sparkles,
  Sun,
  Waves
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import type { ChartPoint, HistoryResponse, InstrumentType, Tick } from "../../dtos/market";
import { ageLabel, formatNumber, formatSigned, formatTime } from "../../utils/format";

export type ChartVariant = "area" | "line";
export type ThemeMode = "light" | "dark";

function latestPoint(points: ChartPoint[]) {
  const carriedLatest = [...points].reverse().find((point) => point.value !== null);
  return points.find((point) => point.isLatest) ?? carriedLatest ?? points[0];
}

interface Props {
  chartType: InstrumentType;
  onChartTypeChange: (value: InstrumentType) => void;
  chartVariant: ChartVariant;
  onChartVariantChange: (value: ChartVariant) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (value: ThemeMode) => void;
  data: HistoryResponse;
  connected: boolean;
  liveTicks: Tick[];
  lastTick: Tick | null;
  onRefresh: () => void;
  currentSymbol: string;
}

export function MarketChart({
  chartType,
  onChartTypeChange,
  chartVariant,
  onChartVariantChange,
  themeMode,
  onThemeModeChange,
  data,
  connected,
  liveTicks,
  lastTick,
  onRefresh,
  currentSymbol
}: Props) {
  const latest = latestPoint(data.points);
  const previous = [...data.points].reverse().find((point) => point.value !== null && point.minute !== latest?.minute);
  const change = latest?.value != null ? latest.value - data.referenceValue : 0;
  const percentChange = data.referenceValue === 0 ? 0 : (change / data.referenceValue) * 100;
  const minuteChange = latest?.value != null && previous?.value != null ? latest.value - previous.value : 0;
  const direction = change >= 0 ? "up" : "down";
  const chartTheme =
    themeMode === "dark"
      ? {
        background: "#11151f",
        panelBg: "bg-[#11151f]",
        headerText: "text-slate-50",
        subText: "text-slate-400",
        chipBg: "bg-slate-950/70",
        chipLabel: "text-slate-400",
        chipValue: "text-slate-100",
        grid: "rgba(148, 163, 184, 0.13)",
        axis: "#94a3b8",
        line: "#86efac",
        areaTop: "rgba(134, 239, 172, 0.38)",
        areaMid: "rgba(34, 197, 94, 0.18)",
        areaBottom: "rgba(17, 21, 31, 0.02)",
        tooltipBg: "rgba(15, 23, 42, 0.94)",
        tooltipText: "#f8fafc",
        prevLine: "rgba(203, 213, 225, 0.45)",
        prevLabelBg: "rgba(15, 23, 42, 0.9)",
        prevLabelText: "#e2e8f0",
        inactiveVariantButton: "text-slate-400 hover:text-slate-100"
      }
      : {
        background: "#f8fafc",
        panelBg: "bg-slate-50",
        headerText: "text-slate-950",
        subText: "text-slate-500",
        chipBg: "bg-white/85",
        chipLabel: "text-slate-500",
        chipValue: "text-slate-800",
        grid: "rgba(100, 116, 139, 0.16)",
        axis: "#64748b",
        line: "#16a34a",
        areaTop: "rgba(34, 197, 94, 0.28)",
        areaMid: "rgba(34, 197, 94, 0.12)",
        areaBottom: "rgba(248, 250, 252, 0.02)",
        tooltipBg: "rgba(255, 255, 255, 0.96)",
        tooltipText: "#0f172a",
        prevLine: "rgba(71, 85, 105, 0.45)",
        prevLabelBg: "rgba(255, 255, 255, 0.94)",
        prevLabelText: "#334155",
        inactiveVariantButton: "text-slate-500 hover:text-slate-950"
      };
  const yValues = data.points.map((point) => ({
    value: point.value,
    itemStyle: { color: point.color }
  }));
  const latestIndex = data.points.findIndex((point) => point.minute === latest.minute);

  const option = {
    animation: true,
    animationDuration: 700,
    animationDurationUpdate: 650,
    animationEasing: "cubicOut",
    animationEasingUpdate: "cubicOut",
    backgroundColor: chartTheme.background,
    grid: { top: 40, right: 30, bottom: 42, left: 64 },
    tooltip: {
      trigger: "axis",
      backgroundColor: chartTheme.tooltipBg,
      borderColor: "rgba(148, 163, 184, 0.28)",
      textStyle: { color: chartTheme.tooltipText },
      formatter(params: Array<{ dataIndex: number; data: { value: number | null } }>) {
        const item = params[0];
        const point = data.points[item.dataIndex];
        return `${formatTime(point.minute)}<br/>Value: <strong>${formatNumber(item.data.value)}</strong><br/>${point.carried ? "Carried forward" : "Source update"}`;
      }
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.points.map((point) => point.minute),
      axisLine: { lineStyle: { color: chartTheme.grid } },
      splitLine: { show: false, lineStyle: { color: chartTheme.grid } },
      axisLabel: {
        formatter: (value: string) => formatTime(value),
        hideOverlap: true,
        color: chartTheme.axis
      }
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: chartTheme.grid } },
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
        color: chartTheme.axis
      }
    },
    graphic: [],
    series: [
      {
        name: data.instrument.symbol,
        type: "line",
        showSymbol: true,
        symbolSize: 5.5,
        smooth: 0.38,
        smoothMonotone: "x",
        connectNulls: false,
        data: yValues,
        areaStyle:
          chartVariant === "area"
            ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: chartTheme.areaTop },
                  { offset: 0.55, color: chartTheme.areaMid },
                  { offset: 1, color: chartTheme.areaBottom }
                ]
              }
            }
            : undefined,
        lineStyle: { width: 3, color: chartTheme.line, cap: "round", join: "round" },
        markLine: {
          symbol: "none",
          animation: false,
          silent: true,
          lineStyle: { type: "dotted", color: chartTheme.prevLine, width: 1.25 },
          label: {
            formatter: `Previous close ${formatNumber(data.referenceValue)}`,
            color: chartTheme.prevLabelText,
            backgroundColor: chartTheme.prevLabelBg,
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 6],
            fontSize: 11,
            position: "insideEndTop"
          },
          data: [{ yAxis: data.referenceValue }]
        }
      },
      {
        name: "Latest",
        type: "effectScatter",
        coordinateSystem: "cartesian2d",
        rippleEffect: { brushType: "stroke", scale: 3.5, period: 2.6 },
        symbolSize: 12,
        data:
          latest && latest.value !== null && latestIndex >= 0
            ? [[latest.minute, latest.value]]
            : [],
        itemStyle: { color: latest?.color ?? "#EE27F5" }
      }
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-panel">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Waves className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-semibold text-foreground">WingFin Market Monitor</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {data.market.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Session {formatTime(data.market.open)}-{formatTime(data.market.close)} · {data.market.timezone}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Chart type"
              value={chartType}
              onChange={(event) => onChartTypeChange(event.target.value as InstrumentType)}
              aria-label="Chart type"
            >
              <option value="index">Index · DSEX</option>
              <option value="stock">Stock · GP</option>
            </Select>
            <Button variant="outline" onClick={onRefresh} aria-label="Refresh chart">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onThemeModeChange(themeMode === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-card p-4 shadow-sm">
              <div className="text-xs font-medium uppercase text-muted-foreground">Latest</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-normal text-foreground">{formatNumber(latest?.value)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{data.instrument.displayName}</div>
                </div>
                <span className={`rounded-md p-2 ${direction === "up" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {direction === "up" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-card p-4 shadow-sm">
              <div className="text-xs font-medium uppercase text-muted-foreground">Day change</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-semibold ${change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatSigned(change)}
                </span>
                <span className={`text-sm font-medium ${change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatSigned(percentChange)}%
                </span>
              </div>
              <div className="mt-2 inline-flex rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                Baseline {formatNumber(data.referenceValue)}
              </div>
            </div>
            <div className="rounded-lg bg-card p-4 shadow-sm">
              <div className="text-xs font-medium uppercase text-muted-foreground">Current minute move</div>
              <div className={`mt-2 text-2xl font-semibold ${minuteChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatSigned(minuteChange)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {latest ? formatTime(latest.minute) : "--"}
              </div>
            </div>
          </div>

          <div className={`rounded-lg ${chartTheme.panelBg} p-3 shadow-sm`}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2 px-1">
              <div>
                <h2 className={`text-base font-semibold ${chartTheme.headerText}`}>{data.instrument.symbol} live session</h2>
                <p className={`text-sm ${chartTheme.subText}`}>Gapless 1-minute timeline with irregular source ticks</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className={`inline-flex rounded-md ${chartTheme.chipBg} p-1`}>
                  <button
                    className={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition ${chartVariant === "area" ? "bg-primary text-primary-foreground" : chartTheme.inactiveVariantButton
                      }`}
                    type="button"
                    onClick={() => onChartVariantChange("area")}
                  >
                    <ChartArea className="h-3.5 w-3.5" />
                    Area
                  </button>
                  <button
                    className={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition ${chartVariant === "line" ? "bg-primary text-primary-foreground" : chartTheme.inactiveVariantButton
                      }`}
                    type="button"
                    onClick={() => onChartVariantChange("line")}
                  >
                    <ChartLine className="h-3.5 w-3.5" />
                    Line
                  </button>
                </div>
                <div className={`rounded-md ${chartTheme.chipBg} px-3 py-2 text-right`}>
                  <div className={`text-xs font-medium uppercase ${chartTheme.chipLabel}`}>Previous close</div>
                  <div className={`text-sm font-semibold ${chartTheme.chipValue}`}>{formatNumber(data.referenceValue)}</div>
                </div>
                <div className={`rounded-md ${chartTheme.chipBg} px-3 py-2 text-right`}>
                  <div className={`text-xs font-medium uppercase ${chartTheme.chipLabel}`}>Source tick</div>
                  <div className={`text-sm font-semibold ${chartTheme.chipValue}`}>{ageLabel(lastTick?.time)}</div>
                </div>
              </div>
            </div>
            <div className="relative h-[58vh] min-h-[420px] w-full overflow-hidden rounded-[6px]">
              {/* <div className="pointer-events-none absolute right-4 top-4 z-10">
                <div
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg backdrop-blur-md ${
                    themeMode === "dark"
                      ? "bg-slate-950/80 text-slate-50"
                      : "bg-white/85 text-slate-900"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: latest?.color ?? chartTheme.line }}>
                    <span className="text-sm font-semibold text-white">
                      {currentSymbol.slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${themeMode === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      Latest value
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-2xl font-semibold leading-none tracking-tight">
                        {formatNumber(latest?.value)}
                      </div>
                      <div className={`text-sm font-semibold ${change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatSigned(change)}
                      </div>
                    </div>
                    <div className={`mt-1 text-xs ${themeMode === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      {latest ? formatTime(latest.minute) : "--"} · current minute
                    </div>
                  </div>
                </div>
              </div> */}
              <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <div className="rounded-lg bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Radio className={connected ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-muted-foreground"} />
                Fake source simulator
              </div>
              <span className={connected ? "h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500" : "h-2.5 w-2.5 rounded-full bg-slate-300"} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Unequal updates arrive within 3 seconds. Index fluctuates +/-100 and stock +/-1 around the baseline.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted p-3">
                <div className="text-muted-foreground">Transport</div>
                <div className="mt-1 font-semibold text-foreground">SSE</div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-muted-foreground">Last event</div>
                <div className="mt-1 font-semibold text-foreground">{ageLabel(lastTick?.time)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Signal className="h-4 w-4 text-primary" />
              Live update feed
            </div>
            <div className="grid max-h-72 gap-2 overflow-auto pr-1">
              {liveTicks.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Waiting for simulator ticks...</div>
              ) : (
                liveTicks.map((tick) => {
                  const tickChange = tick.value - tick.yesterdayClose;
                  return (
                    <div key={`${tick.time}-${tick.value}`} className="rounded-md bg-background p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-foreground">{tick.symbol}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(tick.time)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{formatNumber(tick.value)}</span>
                        <span className={tickChange >= 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-rose-700"}>
                          {formatSigned(tickChange)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-lg bg-card p-4 text-sm shadow-sm">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-[#7327F5]" />
              Color rules
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Above reference</span>
                <span className="font-medium text-[#7327F5]">#7327F5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Below reference</span>
                <span className="font-medium text-[#F52738]">#F52738</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Equal reference</span>
                <span className="font-medium text-[#EE27F5]">#EE27F5</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

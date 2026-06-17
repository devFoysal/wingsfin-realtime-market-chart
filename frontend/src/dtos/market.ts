export type InstrumentType = "index" | "stock";

export interface Instrument {
  id: number;
  symbol: string;
  type: InstrumentType;
  displayName: string;
  yesterdayClose: number;
}

export interface MarketInfo {
  status: "OPEN" | "CLOSED";
  isOpen?: boolean;
  timezone: string;
  open: string;
  close: string;
  now: string;
}

export interface ChartPoint {
  minute: string;
  value: number | null;
  carried: boolean;
  isLatest: boolean;
  color: "#7327F5" | "#F52738" | "#EE27F5";
}

export interface HistoryResponse {
  instrument: Instrument;
  market: MarketInfo;
  points: ChartPoint[];
  latest?: ChartPoint;
  referenceValue: number;
}

export interface Tick {
  instrumentId: number;
  symbol: string;
  type: InstrumentType;
  time: string;
  value: number;
  yesterdayClose: number;
}

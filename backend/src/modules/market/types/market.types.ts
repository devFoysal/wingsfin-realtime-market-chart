export type InstrumentType = "index" | "stock";

export interface Instrument {
  id: number;
  symbol: string;
  type: InstrumentType;
  displayName: string;
  yesterdayClose: number;
}

export interface Tick {
  instrumentId: number;
  symbol: string;
  type: InstrumentType;
  time: string;
  value: number;
  yesterdayClose: number;
}

export interface ChartPoint {
  minute: string;
  value: number | null;
  carried: boolean;
  isLatest: boolean;
  color: "#7327F5" | "#F52738" | "#EE27F5";
}

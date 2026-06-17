import { config } from "../../../config/env.js";
import { getMarketSession, latestVisibleMinute } from "../../market/services/session.service.js";
import { getInstrument, storeTick, tickToSourcePayload } from "../../market/services/ticks.service.js";
import type { InstrumentType } from "../../market/types/market.types.js";
import { shapedMarketValue } from "./market-shape.service.js";

interface SimulatorState {
  noise: number;
}

const states = new Map<string, SimulatorState>();

function randomDelay() {
  return 400 + Math.floor(Math.random() * 2600);
}

function nextValue(type: InstrumentType, state: SimulatorState, yesterdayClose: number, progress: number) {
  const range = type === "index" ? 100 : 1;
  state.noise = state.noise * 0.72 + (Math.random() - 0.5) * 0.28;
  return shapedMarketValue({
    baseline: yesterdayClose,
    progress,
    range,
    noise: state.noise
  });
}

async function emitFor(type: InstrumentType, symbol: string) {
  const instrument = await getInstrument(type, symbol);
  if (!instrument) return;

  const key = `${type}:${symbol}`;
  const session = getMarketSession();
  const visibleMinute = latestVisibleMinute(session);
  const progress = (visibleMinute.toMillis() - session.open.toMillis()) / (session.close.toMillis() - session.open.toMillis());
  const state = states.get(key) ?? { noise: Math.random() - 0.5 };
  const next = nextValue(type, state, instrument.yesterdayClose, progress);
  states.set(key, state);

  const payload = tickToSourcePayload(type, symbol, visibleMinute.toMillis(), next, instrument.yesterdayClose);
  await storeTick(payload);
}

export function startSimulator() {
  if (!config.SIMULATOR_ENABLED) return () => undefined;

  let stopped = false;
  const timers: NodeJS.Timeout[] = [];

  const loop = (type: InstrumentType, symbol: string) => {
    const timer = setTimeout(() => {
      void (async () => {
        if (stopped) return;
        if (getMarketSession().isOpen) {
          await emitFor(type, symbol);
        }
        loop(type, symbol);
      })();
    }, randomDelay());
    timers.push(timer);
  };

  loop("index", config.DEFAULT_INDEX_SYMBOL);
  loop("stock", config.DEFAULT_STOCK_SYMBOL);

  return () => {
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
  };
}

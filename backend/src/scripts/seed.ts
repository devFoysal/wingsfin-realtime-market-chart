import { DateTime } from "luxon";
import { config } from "../config/env.js";
import { closeDb, pool } from "../infrastructure/postgres/pool.js";
import { getMarketSession } from "../modules/market/services/session.service.js";
import { getInstrument, tickToSourcePayload } from "../modules/market/services/ticks.service.js";
import { shapedMarketValue } from "../modules/simulator/services/market-shape.service.js";

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

async function seedInstrument(type: "index" | "stock", symbol: string, seed: number) {
  const instrument = await getInstrument(type, symbol);
  if (!instrument) throw new Error(`Missing instrument ${type}:${symbol}`);

  const session = getMarketSession(DateTime.now().setZone(config.MARKET_TIMEZONE));
  const rand = seededRandom(seed);
  const end = session.now < session.open ? session.open.plus({ minutes: 90 }) : session.now < session.close ? session.now : session.close;
  const range = type === "index" ? 100 : 1;
  let cursor = session.open.plus({ seconds: 5 + Math.floor(rand() * 35) });

  await pool.query(
    "delete from market_ticks where instrument_id = $1 and time >= $2 and time <= $3",
    [instrument.id, session.open.toUTC().toISO(), session.close.toUTC().toISO()]
  );

  while (cursor <= end) {
    const progress = (cursor.toMillis() - session.open.toMillis()) / (session.close.toMillis() - session.open.toMillis());
    const value = shapedMarketValue({
      baseline: instrument.yesterdayClose,
      progress,
      range,
      noise: rand() - 0.5
    });
    const payload = tickToSourcePayload(type, symbol, cursor.toMillis(), value, instrument.yesterdayClose);
    await pool.query(
      `insert into market_ticks (instrument_id, time, value, yesterday_close, source_payload)
       values ($1, $2, $3, $4, $5)`,
      [instrument.id, cursor.toUTC().toISO(), type === "index" ? payload.capital_value : payload.close_price, instrument.yesterdayClose, payload]
    );
    cursor = cursor.plus({ seconds: 20 + Math.floor(rand() * 155) });
  }
}

await seedInstrument("index", config.DEFAULT_INDEX_SYMBOL, 42);
await seedInstrument("stock", config.DEFAULT_STOCK_SYMBOL, 77);
await closeDb();
console.log("Seeded irregular historical market data");

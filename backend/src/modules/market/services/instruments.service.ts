import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { instruments, type InstrumentRow } from "../../../db/schema.js";
import type { Instrument, InstrumentType } from "../types/market.types.js";

function rowToInstrument(row: InstrumentRow): Instrument {
  return {
    id: row.id,
    symbol: row.symbol,
    type: row.type,
    displayName: row.displayName,
    yesterdayClose: row.yesterdayClose
  };
}

export async function listInstruments() {
  const rows = await db
    .select()
    .from(instruments)
    .orderBy(asc(instruments.type), asc(instruments.symbol));
  return rows.map(rowToInstrument);
}

export async function getInstrument(type: InstrumentType, symbol: string) {
  const [row] = await db
    .select()
    .from(instruments)
    .where(and(eq(instruments.type, type), eq(instruments.symbol, symbol)))
    .limit(1);
  return row ? rowToInstrument(row) : null;
}

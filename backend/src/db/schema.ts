import { bigserial, integer, jsonb, numeric, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { InstrumentType } from "../modules/market/types/market.types.js";

export const instruments = pgTable(
  "instruments",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    type: text("type").$type<InstrumentType>().notNull(),
    displayName: text("display_name").notNull(),
    yesterdayClose: numeric("yesterday_close", { precision: 16, scale: 4, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    instrumentSymbolTypeUnique: unique("instruments_type_symbol_unique").on(table.type, table.symbol)
  })
);

export const marketTicks = pgTable("market_ticks", {
  id: bigserial("id", { mode: "number" }).notNull(),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id, { onDelete: "cascade" }),
  time: timestamp("time", { withTimezone: true, mode: "date" }).notNull(),
  value: numeric("value", { precision: 16, scale: 4, mode: "number" }).notNull(),
  yesterdayClose: numeric("yesterday_close", { precision: 16, scale: 4, mode: "number" }).notNull(),
  sourcePayload: jsonb("source_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

export type InstrumentRow = typeof instruments.$inferSelect;
export type MarketTickRow = typeof marketTicks.$inferSelect;

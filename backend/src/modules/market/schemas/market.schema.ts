import { z } from "zod";

export const chartQuerySchema = z.object({
  type: z.enum(["index", "stock"]),
  symbol: z.string().min(1).max(24).transform((value) => value.toUpperCase())
});

export const indexPayloadSchema = z.object({
  index_id: z.string().min(1).transform((value) => value.toUpperCase()),
  time: z.number().int().positive(),
  capital_value: z.number(),
  percentage_change_from_yesterday_close_value: z.number().optional()
});

export const stockPayloadSchema = z.object({
  trade_code: z.string().min(1).transform((value) => value.toUpperCase()),
  time: z.number().int().positive(),
  close_price: z.number(),
  yesterday_close_price: z.number().positive()
});

export const simulateTickSchema = z.union([indexPayloadSchema, stockPayloadSchema]);

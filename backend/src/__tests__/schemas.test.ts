import { describe, expect, it } from "vitest";
import { indexPayloadSchema, stockPayloadSchema } from "../modules/market/schemas.js";

describe("source payload validation", () => {
  it("accepts index updates", () => {
    expect(
      indexPayloadSchema.parse({
        index_id: "dsex",
        time: 1779336701000,
        capital_value: 5222.22,
        percentage_change_from_yesterday_close_value: 4.12
      }).index_id
    ).toBe("DSEX");
  });

  it("accepts stock updates", () => {
    expect(
      stockPayloadSchema.parse({
        trade_code: "gp",
        time: 1779336913000,
        close_price: 238.79,
        yesterday_close_price: 238.88
      }).trade_code
    ).toBe("GP");
  });
});

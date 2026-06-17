import { describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";

vi.stubEnv("MARKET_STATUS_OVERRIDE", "auto");
vi.stubEnv("MARKET_OPEN_TIME", "10:00");
vi.stubEnv("MARKET_CLOSE_TIME", "14:30");
vi.stubEnv("MARKET_TIMEZONE", "Asia/Dhaka");

describe("market session", () => {
  it("detects open market from configurable hours", async () => {
    const { getMarketSession } = await import("../modules/market/market-session.js");
    const session = getMarketSession(DateTime.fromISO("2026-06-15T11:15:20", { zone: "Asia/Dhaka" }));
    expect(session.status).toBe("OPEN");
    expect(session.open.toFormat("HH:mm")).toBe("10:00");
    expect(session.close.toFormat("HH:mm")).toBe("14:30");
  });

  it("detects closed market outside configurable hours", async () => {
    const { getMarketSession } = await import("../modules/market/market-session.js");
    const session = getMarketSession(DateTime.fromISO("2026-06-15T15:01:00", { zone: "Asia/Dhaka" }));
    expect(session.status).toBe("CLOSED");
  });
});

import { describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";

vi.stubEnv("MARKET_STATUS_OVERRIDE", "auto");
vi.stubEnv("MARKET_OPEN_TIME", "10:00");
vi.stubEnv("MARKET_CLOSE_TIME", "10:03");
vi.stubEnv("MARKET_TIMEZONE", "Asia/Dhaka");

describe("gapless chart series", () => {
  it("uses latest tick within a minute and carries forward missing minutes", async () => {
    const { getMarketSession } = await import("../modules/market/services/session.service.js");
    const { buildGaplessSeries } = await import("../modules/market/services/ticks.service.js");
    const session = getMarketSession(DateTime.fromISO("2026-06-15T10:02:30", { zone: "Asia/Dhaka" }));

    const points = buildGaplessSeries({
      session,
      yesterdayClose: 100,
      ticks: [
        { time: "2026-06-15T04:00:10.000Z", value: 101 },
        { time: "2026-06-15T04:00:50.000Z", value: 102 },
        { time: "2026-06-15T04:02:05.000Z", value: 99 }
      ]
    });

    expect(points).toHaveLength(4);
    expect(points[0].value).toBe(102);
    expect(points[1].value).toBe(102);
    expect(points[1].carried).toBe(true);
    expect(points[2].value).toBe(99);
    expect(points[2].isLatest).toBe(true);
    expect(points[3].value).toBeNull();
  });

  it("keeps shaped simulator values inside required ranges", async () => {
    const { shapedMarketValue } = await import("../modules/simulator/services/market-shape.service.js");
    const indexValues = Array.from({ length: 101 }, (_, index) =>
      shapedMarketValue({ baseline: 5222.22, progress: index / 100, range: 100, noise: index % 2 ? 0.5 : -0.5 })
    );
    const stockValues = Array.from({ length: 101 }, (_, index) =>
      shapedMarketValue({ baseline: 238.88, progress: index / 100, range: 1, noise: index % 2 ? 0.5 : -0.5 })
    );

    expect(Math.min(...indexValues)).toBeGreaterThanOrEqual(5122.22);
    expect(Math.max(...indexValues)).toBeLessThanOrEqual(5322.22);
    expect(Math.min(...stockValues)).toBeGreaterThanOrEqual(237.88);
    expect(Math.max(...stockValues)).toBeLessThanOrEqual(239.88);
    const firstQuarter = indexValues.slice(0, 25);
    const secondHalf = indexValues.slice(50);
    const minIndex = indexValues.indexOf(Math.min(...indexValues));
    expect(minIndex).toBeLessThan(15);
    expect(indexValues[3]).toBeLessThan(indexValues[0]);
    expect(secondHalf.at(-1)).toBeGreaterThan(firstQuarter[0]);
  });
});

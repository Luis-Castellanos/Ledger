import { describe, expect, it } from "vitest";
import { buildNetWorthSeries, filterSeriesByRange } from "./net-worth";

describe("buildNetWorthSeries", () => {
  it("returns empty for no snapshots", () => {
    expect(buildNetWorthSeries([])).toEqual([]);
  });

  it("carries forward each account's last known balance", () => {
    const series = buildNetWorthSeries([
      { accountId: "checking", asOfDate: "2026-01-01", balanceMinor: 100_00 },
      { accountId: "card", asOfDate: "2026-01-01", balanceMinor: -40_00 },
      { accountId: "checking", asOfDate: "2026-02-01", balanceMinor: 150_00 },
      { accountId: "card", asOfDate: "2026-03-01", balanceMinor: -10_00 },
    ]);

    expect(series).toEqual([
      { date: "2026-01-01", netWorthMinor: 60_00, assetsMinor: 100_00, liabilitiesMinor: -40_00 },
      // card balance carries forward from January
      { date: "2026-02-01", netWorthMinor: 110_00, assetsMinor: 150_00, liabilitiesMinor: -40_00 },
      // checking carries forward from February
      { date: "2026-03-01", netWorthMinor: 140_00, assetsMinor: 150_00, liabilitiesMinor: -10_00 },
    ]);
  });

  it("handles unsorted input", () => {
    const series = buildNetWorthSeries([
      { accountId: "a", asOfDate: "2026-02-01", balanceMinor: 200 },
      { accountId: "a", asOfDate: "2026-01-01", balanceMinor: 100 },
    ]);

    expect(series.map((point) => point.netWorthMinor)).toEqual([100, 200]);
  });
});

describe("filterSeriesByRange", () => {
  const series = buildNetWorthSeries([
    { accountId: "a", asOfDate: "2026-01-01", balanceMinor: 100 },
    { accountId: "a", asOfDate: "2026-02-01", balanceMinor: 200 },
    { accountId: "a", asOfDate: "2026-03-01", balanceMinor: 300 },
  ]);

  it("returns everything for a null range", () => {
    expect(filterSeriesByRange(series, null)).toHaveLength(3);
  });

  it("anchors the window with the prior point", () => {
    const filtered = filterSeriesByRange(series, "2026-01-15");
    expect(filtered.map((point) => point.date)).toEqual(["2026-01-15", "2026-02-01", "2026-03-01"]);
    expect(filtered[0].netWorthMinor).toBe(100);
  });

  it("passes through when the window covers the whole series", () => {
    expect(filterSeriesByRange(series, "2025-12-01")).toHaveLength(3);
  });
});

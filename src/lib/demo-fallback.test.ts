import { describe, expect, it } from "vitest";
import { canUseLocalFallback, dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, productionFallbackMessage } from "./demo-fallback";

describe("demo fallback policy", () => {
  it("never substitutes demo values, in any environment", () => {
    expect(demoFallback(["demo"], [])).toEqual([]);
    expect(fallbackDataSource()).toBe("unavailable");
  });

  it("keeps production fallback copy generic", () => {
    expect(productionFallbackMessage("Export")).toBe("Export could not be completed. Please try again.");
  });

  it("blocks local mutation fallbacks outside explicit demo state", () => {
    expect(canUseLocalFallback("database")).toBe(false);
    expect(canUseLocalFallback("unavailable")).toBe(false);
    expect(canUseLocalFallback("demo")).toBe(true);
  });

  it("labels unavailable data separately from live database state", () => {
    expect(dataSourceLabel("database")).toBe("DB backed");
    expect(dataSourceLabel("demo")).toBe("Demo mode");
    expect(dataSourceLabel("unavailable")).toBe("Data unavailable");
    expect(dataSourceStatusClass("database")).toBe("status-chip status-chip-live");
  });
});

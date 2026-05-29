import { afterEach, describe, expect, it, vi } from "vitest";
import { canUseLocalFallback, dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, productionFallbackMessage } from "./demo-fallback";

describe("demo fallback policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses development demo values in the test environment", () => {
    expect(demoFallback(["demo"], [])).toEqual(["demo"]);
    expect(fallbackDataSource()).toBe("demo");
  });

  it("keeps production fallback copy generic", () => {
    expect(productionFallbackMessage("Export")).toBe("Export could not be completed. Please try again.");
  });

  it("allows local mutation fallbacks only in fallback-capable states", () => {
    expect(canUseLocalFallback("demo")).toBe(true);
    expect(canUseLocalFallback("database")).toBe(true);
    expect(canUseLocalFallback("unavailable")).toBe(true);
  });

  it("blocks local mutation fallbacks in production unless already in demo state", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const policy = await import("./demo-fallback");

    expect(policy.canUseLocalFallback("database")).toBe(false);
    expect(policy.canUseLocalFallback("unavailable")).toBe(false);
    expect(policy.canUseLocalFallback("demo")).toBe(true);
  });

  it("labels unavailable data separately from live database state", () => {
    expect(dataSourceLabel("database")).toBe("DB backed");
    expect(dataSourceLabel("demo")).toBe("Demo mode");
    expect(dataSourceLabel("unavailable")).toBe("Data unavailable");
    expect(dataSourceStatusClass("database")).toBe("status-chip status-chip-live");
  });
});

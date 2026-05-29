import { describe, expect, it } from "vitest";
import { dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, productionFallbackMessage } from "./demo-fallback";

describe("demo fallback policy", () => {
  it("uses development demo values in the test environment", () => {
    expect(demoFallback(["demo"], [])).toEqual(["demo"]);
    expect(fallbackDataSource()).toBe("demo");
  });

  it("keeps production fallback copy generic", () => {
    expect(productionFallbackMessage("Export")).toBe("Export could not be completed. Please try again.");
  });

  it("labels unavailable data separately from live database state", () => {
    expect(dataSourceLabel("database")).toBe("DB backed");
    expect(dataSourceLabel("demo")).toBe("Demo mode");
    expect(dataSourceLabel("unavailable")).toBe("Data unavailable");
    expect(dataSourceStatusClass("database")).toBe("status-chip status-chip-live");
  });
});

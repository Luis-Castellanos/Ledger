export type DataSourceState = "database" | "demo" | "unavailable";

/*
 * Demo fallback is permanently disabled: pages must fail loudly instead of
 * silently substituting sample data. This module survives only so unmigrated
 * legacy workbenches keep compiling; each page rebuild removes its call
 * sites, and the module is deleted with the last legacy page.
 */
export const allowDemoFallback = false;

export function demoFallback<T>(demoValue: T, productionValue: T): T {
  void demoValue;
  return productionValue;
}

export function fallbackDataSource(): DataSourceState {
  return "unavailable";
}

export function canUseLocalFallback(source: DataSourceState): boolean {
  return source === "demo";
}

export function productionFallbackMessage(action: string): string {
  return `${action} could not be completed. Please try again.`;
}

export function dataSourceLabel(source: DataSourceState): string {
  if (source === "database") {
    return "DB backed";
  }

  if (source === "demo") {
    return "Demo mode";
  }

  return "Data unavailable";
}

export function dataSourceStatusClass(source: DataSourceState): string {
  return source === "database" ? "status-chip status-chip-live" : "status-chip";
}

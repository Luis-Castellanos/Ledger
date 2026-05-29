export type DataSourceState = "database" | "demo" | "unavailable";

export const allowDemoFallback = process.env.NODE_ENV !== "production";

export function demoFallback<T>(demoValue: T, productionValue: T): T {
  return allowDemoFallback ? demoValue : productionValue;
}

export function fallbackDataSource(): DataSourceState {
  return allowDemoFallback ? "demo" : "unavailable";
}

export function canUseLocalFallback(source: DataSourceState): boolean {
  return allowDemoFallback || source === "demo";
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

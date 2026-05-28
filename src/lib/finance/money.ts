export function formatMoney(minorUnits: number, currency = "USD") {
  const absolute = Math.abs(minorUnits) / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(absolute);

  return minorUnits < 0 ? `-${formatted}` : formatted;
}

export function parseDollarAmount(input: string) {
  const cleaned = input.replace(/[$,\s]/g, "");
  const value = Number(cleaned);

  if (!Number.isFinite(value)) {
    throw new Error("Invalid money amount");
  }

  return Math.round(value * 100);
}

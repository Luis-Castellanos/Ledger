"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

/*
 * Every money figure in the app renders through one of these so digits stay
 * tabular, signs stay colored consistently, and big numbers animate.
 */

export function Money({
  amountMinor,
  currency = "USD",
  colorBySign = false,
  showPlus = false,
  className,
}: {
  amountMinor: number;
  currency?: string;
  colorBySign?: boolean;
  showPlus?: boolean;
  className?: string;
}) {
  return (
    <span
      data-money
      className={cn(
        colorBySign && amountMinor > 0 && "text-positive",
        colorBySign && amountMinor < 0 && "text-negative",
        className,
      )}
    >
      {showPlus && amountMinor > 0 ? "+" : ""}
      {formatSigned(amountMinor, currency)}
    </span>
  );
}

export function AnimatedMoney({
  amountMinor,
  currency = "USD",
  className,
}: {
  amountMinor: number;
  currency?: string;
  className?: string;
}) {
  return (
    <NumberFlow
      value={amountMinor / 100}
      format={{ style: "currency", currency, minimumFractionDigits: 2 }}
      className={cn("font-money", className)}
    />
  );
}

function formatSigned(amountMinor: number, currency: string) {
  const absolute = Math.abs(amountMinor) / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(absolute);
  return amountMinor < 0 ? `-${formatted}` : formatted;
}

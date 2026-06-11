"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, startOfYear, subMonths } from "date-fns";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AuthControls } from "@/components/auth-controls";
import { AnimatedMoney, Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/api/client";
import { useAccounts, useBalanceSnapshots } from "@/lib/api/queries/accounts";
import { buildNetWorthSeries, filterSeriesByRange } from "@/lib/finance/net-worth";
import type { ApiBalanceSnapshot } from "@/lib/api/types";

const RANGES = [
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
  { key: "3y", label: "3Y" },
  { key: "all", label: "All" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function rangeStart(range: RangeKey, today: Date): string | null {
  switch (range) {
    case "6m":
      return format(subMonths(today, 6), "yyyy-MM-dd");
    case "ytd":
      return format(startOfYear(today), "yyyy-MM-dd");
    case "1y":
      return format(subMonths(today, 12), "yyyy-MM-dd");
    case "3y":
      return format(subMonths(today, 36), "yyyy-MM-dd");
    case "all":
      return null;
  }
}

const chartConfig = {
  assets: { label: "Assets", color: "var(--chart-2)" },
  liabilities: { label: "Liabilities", color: "var(--chart-4)" },
  netWorth: { label: "Net worth", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function NetWorthWorkbench() {
  const today = useMemo(() => new Date(), []);
  const accounts = useAccounts();
  const snapshots = useBalanceSnapshots();
  const [range, setRange] = useState<RangeKey>("1y");

  const unauthorized = [accounts.error, snapshots.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  if (unauthorized) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to see your position</p>
          <AuthControls />
        </div>
      </Frame>
    );
  }

  if (accounts.isPending || snapshots.isPending) {
    return (
      <Frame>
        <PageSkeleton rows={7} />
      </Frame>
    );
  }

  if (accounts.isError || snapshots.isError) {
    return (
      <Frame>
        <ErrorState
          onRetry={() => {
            void accounts.refetch();
            void snapshots.refetch();
          }}
        />
      </Frame>
    );
  }

  const fullSeries = buildNetWorthSeries(snapshots.data);
  const series = filterSeriesByRange(fullSeries, rangeStart(range, today));
  const latest = fullSeries[fullSeries.length - 1];
  const windowDelta = series.length >= 2 ? series[series.length - 1].netWorthMinor - series[0].netWorthMinor : 0;

  const latestByAccount = new Map<string, ApiBalanceSnapshot>();
  for (const snapshot of snapshots.data) {
    if (!latestByAccount.has(snapshot.accountId)) {
      latestByAccount.set(snapshot.accountId, snapshot);
    }
  }

  const positions = (accounts.data ?? [])
    .filter((account) => account.isActive)
    .map((account) => ({ account, latest: latestByAccount.get(account.id) }))
    .sort((left, right) => (right.latest?.balanceMinor ?? 0) - (left.latest?.balanceMinor ?? 0));

  if (fullSeries.length === 0) {
    return (
      <Frame>
        <EmptyState
          icon={TrendingUp}
          title="No position history yet"
          description="Record balance snapshots on your accounts and the net worth picture assembles itself here."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/accounts">Go to accounts</Link>
            </Button>
          }
        />
      </Frame>
    );
  }

  const chartData = series.map((point) => ({
    date: point.date,
    assets: point.assetsMinor / 100,
    liabilities: Math.abs(point.liabilitiesMinor) / 100,
    netWorth: point.netWorthMinor / 100,
  }));

  return (
    <Frame>
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(120%_80%_at_15%_0%,color-mix(in_oklab,var(--primary)_7%,transparent),transparent_60%)]"
        />
        <CardHeader className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps">Current net worth</p>
            <div className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              <AnimatedMoney amountMinor={latest?.netWorthMinor ?? 0} className="font-display tracking-tight" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <Money amountMinor={windowDelta} colorBySign showPlus className="font-medium" /> over this window ·{" "}
              <span className="text-positive">
                <Money amountMinor={latest?.assetsMinor ?? 0} />
              </span>{" "}
              assets ·{" "}
              <span className="text-negative">
                <Money amountMinor={latest?.liabilitiesMinor ?? 0} />
              </span>{" "}
              owed
            </p>
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={range}
            onValueChange={(value) => value && setRange(value as RangeKey)}
            aria-label="Range"
          >
            {RANGES.map((option) => (
              <ToggleGroupItem key={option.key} value={option.key} className="px-3 font-money text-xs">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="relative">
          {chartData.length >= 2 ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="nwAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.25} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={48}
                  tickFormatter={(value: string) => format(new Date(`${value}T00:00:00`), "MMM yy").toUpperCase()}
                  className="font-money text-[10px]"
                />
                <YAxis
                  width={64}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `$${Intl.NumberFormat("en-US", { notation: "compact" }).format(value)}`}
                  className="font-money text-[10px]"
                />
                <ChartTooltip
                  cursor={{ strokeOpacity: 0.3 }}
                  content={<ChartTooltipContent labelFormatter={(value) => format(new Date(`${value}T00:00:00`), "MMMM d, yyyy")} />}
                />
                <Area dataKey="assets" type="stepAfter" stroke="var(--chart-2)" strokeWidth={1.5} fill="url(#nwAssets)" isAnimationActive={false} />
                <Area dataKey="liabilities" type="stepAfter" stroke="var(--chart-4)" strokeWidth={1.5} fill="transparent" isAnimationActive={false} />
                <Area dataKey="netWorth" type="stepAfter" stroke="var(--chart-1)" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Only one snapshot in this window — record more balances to draw the trend.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <p className="label-caps border-b border-border px-4 py-2">Account positions</p>
        <ul>
          {positions.map(({ account, latest: position }) => (
            <li key={account.id}>
              <Link
                href={`/accounts?account=${encodeURIComponent(account.name)}`}
                className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{account.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[account.institution, account.type.replace("_", " ")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {position ? (
                    <>
                      <Money amountMinor={position.balanceMinor} colorBySign={position.balanceMinor < 0} className="block text-sm" />
                      <span className="font-money text-[10px] text-muted-foreground">
                        as of {format(new Date(`${position.asOfDate}T00:00:00`), "MMM d, yyyy")}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">no balance recorded</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader eyebrow="Position" title="Net Worth" />
      {children}
    </div>
  );
}

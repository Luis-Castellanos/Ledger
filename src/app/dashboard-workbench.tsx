"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths, startOfYear } from "date-fns";
import { ArrowRight, ClipboardCheck, Landmark, PiggyBank, ReceiptText, Sparkles, Target } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CategoryIcon } from "@/components/category-icon";
import { LoadSampleDataButton } from "@/components/load-sample-data-button";
import { OnboardingTour } from "@/components/onboarding-tour";
import { AnimatedMoney, Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { AuthControls } from "@/components/auth-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/api/client";
import { useAccounts, useBalanceSnapshots } from "@/lib/api/queries/accounts";
import { useBudgets, useGoals } from "@/lib/api/queries/budgets";
import { useReviewCount } from "@/lib/api/queries/review";
import { useTransactions } from "@/lib/api/queries/transactions";
import { buildNetWorthSeries, filterSeriesByRange } from "@/lib/finance/net-worth";
import type { ApiTransaction } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "All" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function rangeStart(range: RangeKey, today: Date): string | null {
  switch (range) {
    case "3m":
      return format(subMonths(today, 3), "yyyy-MM-dd");
    case "6m":
      return format(subMonths(today, 6), "yyyy-MM-dd");
    case "ytd":
      return format(startOfYear(today), "yyyy-MM-dd");
    case "1y":
      return format(subMonths(today, 12), "yyyy-MM-dd");
    case "all":
      return null;
  }
}

const netWorthChartConfig = {
  netWorth: { label: "Net worth", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DashboardWorkbench() {
  const today = useMemo(() => new Date(), []);
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");

  const accounts = useAccounts();
  const snapshots = useBalanceSnapshots();
  const monthTransactions = useTransactions({ from: monthStart, limit: 200 });
  const recentTransactions = useTransactions({ limit: 8 });
  const reviewCount = useReviewCount();

  const [range, setRange] = useState<RangeKey>("6m");

  const unauthorized = [accounts.error, snapshots.error, monthTransactions.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  if (unauthorized) {
    return (
      <DashboardFrame>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-20 text-center">
          <p className="label-caps">Private ledger</p>
          <h2 className="font-display text-3xl font-semibold">Sign in to open your ledger</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Every figure on this dashboard comes from your own statements — nothing renders until you are signed in.
          </p>
          <AuthControls />
        </div>
      </DashboardFrame>
    );
  }

  if (accounts.isPending || snapshots.isPending || monthTransactions.isPending) {
    return (
      <DashboardFrame>
        <PageSkeleton rows={8} />
      </DashboardFrame>
    );
  }

  if (accounts.isError || snapshots.isError || monthTransactions.isError) {
    return (
      <DashboardFrame>
        <ErrorState
          message="The ledger could not be loaded. Your data is untouched — this is a read failure, not a write."
          onRetry={() => {
            void accounts.refetch();
            void snapshots.refetch();
            void monthTransactions.refetch();
          }}
        />
      </DashboardFrame>
    );
  }

  if (accounts.data.length === 0) {
    return (
      <DashboardFrame>
        <WelcomePanel />
      </DashboardFrame>
    );
  }

  const fullSeries = buildNetWorthSeries(snapshots.data);
  const series = filterSeriesByRange(fullSeries, rangeStart(range, today));
  const netWorthMinor = fullSeries.length ? fullSeries[fullSeries.length - 1].netWorthMinor : 0;
  const windowDeltaMinor = series.length >= 2 ? series[series.length - 1].netWorthMinor - series[0].netWorthMinor : 0;

  const monthRows = monthTransactions.data.transactions;
  const spendable = monthRows.filter((row) => row.transferStatus !== "transfer" && row.status !== "excluded");
  const incomeMinor = spendable.filter((row) => row.amountMinor > 0).reduce((sum, row) => sum + row.amountMinor, 0);
  const spendMinor = spendable.filter((row) => row.amountMinor < 0).reduce((sum, row) => sum + row.amountMinor, 0);
  const categorySpend = buildCategorySpend(spendable);

  return (
    <DashboardFrame>
      <OnboardingTour />
      <NetWorthHero
        netWorthMinor={netWorthMinor}
        windowDeltaMinor={windowDeltaMinor}
        series={series}
        range={range}
        onRangeChange={setRange}
        hasSnapshots={fullSeries.length > 0}
      />

      <div className="grid gap-4 sm:grid-cols-3" data-tour="kpis">
        <KpiCard label={`${format(today, "MMMM")} income`} amountMinor={incomeMinor} tone="positive" />
        <KpiCard label={`${format(today, "MMMM")} spending`} amountMinor={spendMinor} tone="negative" />
        <KpiCard label={`${format(today, "MMMM")} net`} amountMinor={incomeMinor + spendMinor} tone="auto" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <CategorySpendCard categories={categorySpend} className="lg:col-span-3" />
        <RecentActivityCard
          rows={recentTransactions.data?.transactions ?? []}
          isPending={recentTransactions.isPending}
          className="lg:col-span-2"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewCard count={reviewCount.data ?? 0} />
        <BudgetsCard month={format(today, "yyyy-MM")} />
        <GoalsCard />
      </div>
    </DashboardFrame>
  );
}

function WelcomePanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative px-6 py-12 text-center md:px-12 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_65%)]"
        />
        <div className="relative mx-auto max-w-xl">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Sparkles className="size-7" strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight md:text-4xl">Welcome to your ledger</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            See the whole app in action with a realistic sample ledger — accounts, four months of transactions,
            budgets, goals, and net-worth history. Clear it any time and start fresh.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LoadSampleDataButton size="lg" label="Explore with sample data" />
            <Button asChild size="lg" variant="outline">
              <Link href="/accounts">
                <Landmark /> Start fresh
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Prefer your real numbers?{" "}
            <Link href="/imports" className="font-medium text-primary hover:underline">
              Import a CSV statement
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
        {[
          { icon: ClipboardCheck, title: "Review fast", body: "A keyboard-first queue with smart category suggestions." },
          { icon: PiggyBank, title: "Budget with intent", body: "Monthly category plans tracked against real spending." },
          { icon: Target, title: "Reach your goals", body: "Savings targets with deadlines and live progress." },
        ].map((feature) => (
          <div key={feature.title} className="bg-card px-5 py-5">
            <feature.icon className="size-5 text-primary" strokeWidth={1.7} />
            <p className="mt-2 text-sm font-semibold">{feature.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-8 md:py-8">
      <PageHeader eyebrow="Overview" title="The ledger" description={`As of ${format(new Date(), "MMMM d, yyyy")}`} />
      {children}
    </div>
  );
}

function NetWorthHero({
  netWorthMinor,
  windowDeltaMinor,
  series,
  range,
  onRangeChange,
  hasSnapshots,
}: {
  netWorthMinor: number;
  windowDeltaMinor: number;
  series: ReturnType<typeof buildNetWorthSeries>;
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  hasSnapshots: boolean;
}) {
  const chartData = series.map((point) => ({
    date: point.date,
    netWorth: point.netWorthMinor / 100,
  }));

  return (
    <Card className="relative overflow-hidden" data-tour="net-worth">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(120%_80%_at_15%_0%,color-mix(in_oklab,var(--primary)_7%,transparent),transparent_60%)]"
      />
      <CardHeader className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-caps">Net worth</p>
          <div className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            <AnimatedMoney amountMinor={netWorthMinor} className="font-display tracking-tight" />
          </div>
          {hasSnapshots ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              <Money amountMinor={windowDeltaMinor} colorBySign showPlus className="font-medium" /> over this window
            </p>
          ) : null}
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={range}
          onValueChange={(value) => value && onRangeChange(value as RangeKey)}
          aria-label="Net worth range"
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
          <ChartContainer config={netWorthChartConfig} className="h-56 w-full">
            <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 4 }}>
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
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
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => format(new Date(`${value}T00:00:00`), "MMMM d, yyyy")}
                    formatter={(value) => [
                      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value)),
                      " net worth",
                    ]}
                  />
                }
              />
              <Area
                dataKey="netWorth"
                type="stepAfter"
                stroke="var(--chart-1)"
                strokeWidth={1.5}
                fill="url(#netWorthFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyState
            title="No balance history yet"
            description="Record a balance snapshot on any account and the net worth line starts here."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/accounts">
                  Record a snapshot <ArrowRight />
                </Link>
              </Button>
            }
            className="py-10"
          />
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({ label, amountMinor, tone }: { label: string; amountMinor: number; tone: "positive" | "negative" | "auto" }) {
  const color =
    tone === "auto" ? (amountMinor >= 0 ? "text-positive" : "text-negative") : tone === "positive" ? "text-positive" : "text-negative";
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="label-caps">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", color)}>
          <Money amountMinor={amountMinor} />
        </p>
      </CardContent>
    </Card>
  );
}

function buildCategorySpend(rows: ApiTransaction[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.amountMinor >= 0) {
      continue;
    }
    totals.set(row.category, (totals.get(row.category) ?? 0) + Math.abs(row.amountMinor));
  }
  return [...totals.entries()]
    .map(([name, totalMinor]) => ({ name, totalMinor }))
    .sort((left, right) => right.totalMinor - left.totalMinor)
    .slice(0, 6);
}

function CategorySpendCard({ categories, className }: { categories: { name: string; totalMinor: number }[]; className?: string }) {
  const max = categories[0]?.totalMinor ?? 1;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="label-caps font-sans">Where this month went</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No categorized spending yet"
            description="Once transactions land and are categorized, the month's spending breaks down here."
            className="py-10"
          />
        ) : (
          <ul className="space-y-3">
            {categories.map((category, index) => (
              <li key={category.name}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <CategoryIcon size="sm" name={category.name} color={`var(--chart-${(index % 8) + 1})`} />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <Money amountMinor={-category.totalMinor} className="text-muted-foreground" />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.max(4, Math.round((category.totalMinor / max) * 100))}%`,
                      background: `var(--chart-${(index % 8) + 1})`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({ rows, isPending, className }: { rows: ApiTransaction[]; isPending: boolean; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="label-caps font-sans">Recent activity</CardTitle>
        <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
          <Link href="/transactions">
            View all <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <PageSkeleton rows={5} className="[&>*:nth-child(-n+2)]:hidden" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Nothing recorded yet"
            description="Add a transaction or import a statement to start the register."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.merchant}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(`${row.date}T00:00:00`), "MMM d")} · {row.category}
                  </p>
                </div>
                <Money amountMinor={row.amountMinor} colorBySign={row.amountMinor > 0} className="shrink-0 text-sm" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ count }: { count: number }) {
  return (
    <Card data-tour="review-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="label-caps font-sans">Review queue</CardTitle>
        <ClipboardCheck className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {count > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="mr-1.5 font-money">
                {count}
              </Badge>
              transaction{count === 1 ? "" : "s"} waiting for your eye.
            </p>
            <Button asChild size="sm">
              <Link href="/review">
                Start reviewing <ArrowRight />
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">All caught up — every transaction has been reviewed.</p>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetsCard({ month }: { month: string }) {
  const budgets = useBudgets(month);
  const rows = budgets.data?.rows ?? [];
  const top = [...rows].sort((left, right) => right.spentMinor - left.spentMinor).slice(0, 4);

  return (
    <Card data-tour="budgets-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="label-caps font-sans">Budgets</CardTitle>
        <PiggyBank className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No budgets set for this month yet.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/budgets">
                Plan the month <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {top.map((row) => {
              const percent = row.amountMinor > 0 ? Math.min(100, Math.round((row.spentMinor / row.amountMinor) * 100)) : 0;
              const over = row.remainingMinor < 0;
              return (
                <li key={row.id}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">{row.category}</span>
                    <span className={cn("font-money", over ? "text-negative" : "text-muted-foreground")}>{percent}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(3, percent)}%`, background: over ? "var(--negative)" : "var(--primary)" }}
                    />
                  </div>
                </li>
              );
            })}
            <li className="pt-1">
              <Link href="/budgets" className="text-xs text-muted-foreground hover:underline">
                All budgets →
              </Link>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsCard() {
  const goals = useGoals();
  const active = (goals.data ?? []).filter((goal) => goal.status === "active").slice(0, 3);

  return (
    <Card data-tour="goals-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="label-caps font-sans">Goals</CardTitle>
        <Target className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No savings goals yet — give a number a deadline.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/goals">
                Set a goal <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {active.map((goal) => (
              <li key={goal.id}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">{goal.name}</span>
                  <span className="font-money text-muted-foreground">{goal.percent}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(3, goal.percent)}%`,
                      background: goal.percent >= 100 ? "var(--positive)" : "var(--chart-3)",
                    }}
                  />
                </div>
              </li>
            ))}
            <li className="pt-1">
              <Link href="/goals" className="text-xs text-muted-foreground hover:underline">
                All goals →
              </Link>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

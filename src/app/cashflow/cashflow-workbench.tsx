"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, startOfYear, subMonths } from "date-fns";
import { ArrowLeftRight } from "lucide-react";
import { Bar, ComposedChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { AuthControls } from "@/components/auth-controls";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError, apiFetch } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

type CashflowReport = {
  data: {
    months: { month: string; inflowMinor: number; outflowMinor: number; netMinor: number }[];
    categories: { categoryId: string | null; category: string; totalMinor: number; count: number }[];
  };
};

function rangeStart(range: RangeKey, today: Date): string {
  switch (range) {
    case "3m":
      return format(subMonths(today, 3), "yyyy-MM-dd");
    case "6m":
      return format(subMonths(today, 6), "yyyy-MM-dd");
    case "ytd":
      return format(startOfYear(today), "yyyy-MM-dd");
    case "1y":
      return format(subMonths(today, 12), "yyyy-MM-dd");
  }
}

const chartConfig = {
  inflow: { label: "In", color: "var(--chart-2)" },
  outflow: { label: "Out", color: "var(--chart-4)" },
  net: { label: "Net", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function CashflowWorkbench() {
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState<RangeKey>("6m");
  const [accountId, setAccountId] = useState("");

  const accounts = useAccounts();
  const from = rangeStart(range, today);
  const report = useQuery({
    queryKey: ["reports", "cashflow", from, accountId],
    queryFn: () =>
      apiFetch.get<CashflowReport>(
        `/api/reports/cashflow?from=${from}${accountId ? `&accountId=${accountId}` : ""}`,
      ),
    select: (response) => response.data,
  });

  const unauthorized = [accounts.error, report.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Flows"
        title="Cashflow"
        description="Money in against money out — transfers and excluded entries stay off the books here."
        actions={
          <>
            <Select value={accountId || "__all"} onValueChange={(value) => setAccountId(value === "__all" ? "" : value)}>
              <SelectTrigger size="sm" className="w-fit min-w-32 text-sm" aria-label="Account filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All accounts</SelectItem>
                {(accounts.data ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </>
        }
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to see your flows</p>
          <AuthControls />
        </div>
      ) : report.isPending ? (
        <PageSkeleton rows={7} />
      ) : report.isError ? (
        <ErrorState message={report.error.message} onRetry={() => void report.refetch()} />
      ) : report.data.months.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No flows in this window"
          description="Once transactions land in this period, monthly inflows and outflows chart themselves here."
        />
      ) : (
        <CashflowBody report={report.data} />
      )}
    </div>
  );
}

function CashflowBody({ report }: { report: CashflowReport["data"] }) {
  const totals = report.months.reduce(
    (sums, month) => ({
      inflow: sums.inflow + month.inflowMinor,
      outflow: sums.outflow + month.outflowMinor,
    }),
    { inflow: 0, outflow: 0 },
  );

  const chartData = report.months.map((month) => ({
    month: month.month,
    inflow: month.inflowMinor / 100,
    outflow: Math.abs(month.outflowMinor) / 100,
    net: month.netMinor / 100,
  }));

  const spendCategories = report.categories.filter((category) => category.totalMinor < 0);
  const incomeCategories = report.categories.filter((category) => category.totalMinor > 0).reverse();
  const maxSpend = Math.abs(spendCategories[0]?.totalMinor ?? 1);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="In" amountMinor={totals.inflow} className="text-positive" />
        <SummaryCard label="Out" amountMinor={totals.outflow} className="text-negative" />
        <SummaryCard label="Net" amountMinor={totals.inflow + totals.outflow} className={totals.inflow + totals.outflow >= 0 ? "text-positive" : "text-negative"} />
      </div>

      <Card>
        <CardHeader>
          <p className="label-caps">Month by month</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ComposedChart data={chartData} margin={{ left: 4, right: 4, top: 4 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.25} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => format(new Date(`${value}-01T00:00:00`), "MMM").toUpperCase()}
                className="font-money text-[10px]"
              />
              <YAxis
                width={60}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${Intl.NumberFormat("en-US", { notation: "compact" }).format(value)}`}
                className="font-money text-[10px]"
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(value) => format(new Date(`${value}-01T00:00:00`), "MMMM yyyy")} />}
              />
              <Bar dataKey="inflow" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="outflow" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Line dataKey="net" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <ChartLegend content={<ChartLegendContent />} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList title="Where it went" categories={spendCategories} maxMinor={maxSpend} negative />
        <CategoryList
          title="Where it came from"
          categories={incomeCategories}
          maxMinor={incomeCategories[0]?.totalMinor ?? 1}
        />
      </div>
    </>
  );
}

function SummaryCard({ label, amountMinor, className }: { label: string; amountMinor: number; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="label-caps">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", className)}>
          <Money amountMinor={amountMinor} />
        </p>
      </CardContent>
    </Card>
  );
}

function CategoryList({
  title,
  categories,
  maxMinor,
  negative = false,
}: {
  title: string;
  categories: { categoryId: string | null; category: string; totalMinor: number; count: number }[];
  maxMinor: number;
  negative?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="label-caps">{title}</p>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this window.</p>
        ) : (
          <ul className="space-y-3">
            {categories.slice(0, 10).map((category, index) => (
              <li key={category.categoryId ?? "uncategorized"}>
                <Link
                  href={`/transactions?category=${encodeURIComponent(category.category)}`}
                  className="group block"
                  aria-label={`View ${category.category} transactions`}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate group-hover:underline">
                      {category.category}
                      <span className="ml-1.5 font-money text-[10px] text-muted-foreground">{category.count}</span>
                    </span>
                    <Money amountMinor={category.totalMinor} className="text-muted-foreground" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(3, Math.round((Math.abs(category.totalMinor) / Math.max(maxMinor, 1)) * 100))}%`,
                        background: negative ? `var(--chart-${(index % 4) + 4})` : "var(--chart-2)",
                      }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Download, Layers3, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { bars, categoryBars, ledgerStats, lineSeries, transactions as sampleDashboardTransactions } from "@/lib/sample-data";
import { sampleAccounts, type AccountRow } from "@/lib/finance/account-sample-data";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { formatMoney } from "@/lib/finance/money";

export default function Home() {
  const [accountRows, setAccountRows] = useState<AccountRow[]>(sampleAccounts);
  const [transactionRows, setTransactionRows] = useState<TransactionRow[]>(sampleTransactionRows);
  const [snapshotRows, setSnapshotRows] = useState<DatabaseSnapshot[]>([]);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [accountsResponse, transactionsResponse, snapshotsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
          fetch("/api/balance-snapshots", { headers: { Accept: "application/json" } }),
        ]);

        if (!accountsResponse.ok || !transactionsResponse.ok || !snapshotsResponse.ok) {
          throw new Error("Dashboard APIs unavailable");
        }

        const [accountsPayload, transactionsPayload, snapshotsPayload] = (await Promise.all([
          accountsResponse.json(),
          transactionsResponse.json(),
          snapshotsResponse.json(),
        ])) as [{ accounts: DatabaseAccount[] }, { transactions: TransactionRow[] }, { snapshots: DatabaseSnapshot[] }];

        if (isMounted) {
          setAccountRows(accountsPayload.accounts.map((account) => toAccountRow(account, snapshotsPayload.snapshots)));
          setTransactionRows(transactionsPayload.transactions);
          setSnapshotRows(snapshotsPayload.snapshots);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setAccountRows(sampleAccounts);
          setTransactionRows(sampleTransactionRows);
          setSnapshotRows([]);
          setDataSource("demo");
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardModel = useMemo(() => {
    const position = accountRows.reduce(
      (summary, account) => {
        if (account.assetClass === "liability") {
          summary.liabilities += Math.abs(account.balanceMinor);
        } else {
          summary.assets += account.balanceMinor;
        }

        return summary;
      },
      { assets: 0, liabilities: 0 },
    );

    const cashflow = transactionRows.reduce(
      (summary, transaction) => {
        if (transaction.status === "excluded" || transaction.category === "Internal Transfer") {
          return summary;
        }

        if (transaction.amountMinor > 0) {
          summary.inflow += transaction.amountMinor;
        } else {
          summary.outflow += Math.abs(transaction.amountMinor);
        }

        if (transaction.status === "needs_review") {
          summary.review += 1;
        }

        return summary;
      },
      { inflow: 0, outflow: 0, review: 0 },
    );

    const snapshotAccountIds = new Set(snapshotRows.map((snapshot) => snapshot.accountId));
    const snapshotCoverage = accountRows.length === 0 ? 0 : Math.round((snapshotAccountIds.size / accountRows.length) * 100);
    const netCashflow = cashflow.inflow - cashflow.outflow;

    const stats = [
      { ...ledgerStats[0], label: "Net worth", value: formatMoney(position.assets - position.liabilities) },
      { ...ledgerStats[1], label: "Net cashflow", value: formatMoney(netCashflow) },
      { ...ledgerStats[2], label: "Review exposure", value: `${cashflow.review} rows` },
    ];

    const activity = [
      { label: "Snapshot coverage", value: `${snapshotCoverage}% of accounts`, kind: "cash" },
      { label: "Review queue", value: `${cashflow.review} transactions`, kind: "rule" },
      { label: "Persistence", value: dataSource === "database" ? "DB backed" : "Demo mode", kind: "shield" },
    ];

    return { cashflow, netCashflow, position, snapshotCoverage, stats, activity };
  }, [accountRows, dataSource, snapshotRows, transactionRows]);

  const recentTransactions = useMemo(() => {
    if (dataSource === "demo") {
      return sampleDashboardTransactions;
    }

    return transactionRows.slice(0, 8).map((transaction) => ({
      merchant: transaction.merchant,
      time: `${transaction.date} • ${transaction.account}`,
      amount: transaction.amountMinor,
      category: transaction.category,
      direction: transaction.amountMinor > 0 ? "in" : "out",
      color: transaction.amountMinor > 0 ? "#57b89d" : "#d76b64",
    }));
  }, [dataSource, transactionRows]);

  const cashflowTitle = useMemo(() => {
    const outflow = transactionRows.reduce((total, transaction) => {
      if (transaction.status === "excluded" || transaction.category === "Internal Transfer" || transaction.amountMinor > 0) {
        return total;
      }

      return total + Math.abs(transaction.amountMinor);
    }, 0);

    return `${formatMoney(-outflow)} spent`;
  }, [transactionRows]);

  return (
    <AppShell active="Dashboard">
        <section className="min-w-0">
          <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Private beta ledger</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Monthly control room</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search transactions" placeholder="Search ledger" />
              </label>
              <a className="icon-button" aria-label="Export backup package" href="/api/exports?format=backup_package">
                <Download size={17} />
              </a>
            </div>
          </header>

          <div className="grid min-h-[calc(100vh-7.5rem)] grid-cols-1 xl:grid-cols-[minmax(380px,0.84fr)_minmax(0,1.4fr)]">
            <section className="grid min-w-0 auto-rows-min gap-0 border-b border-[var(--line)] xl:border-b-0 xl:border-r">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {dashboardModel.stats.map((stat) => (
                  <article className="stat-panel" key={stat.label}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="panel-label">{stat.label}</p>
                        <p className="mt-1 font-mono text-xl text-[var(--ink-strong)]">{stat.value}</p>
                      </div>
                      <span className={stat.delta.startsWith("+") ? "delta-up" : "delta-down"}>{stat.delta}</span>
                    </div>
                    <MiniLine trend={stat.trend} tone={stat.tone} />
                  </article>
                ))}
              </div>

              <article className="panel min-h-[560px] border-t border-[var(--line)]">
                <div className="panel-header">
                  <div>
                    <p className="panel-label">Transactions</p>
                    <h2 className="panel-title">Recent ledger activity</h2>
                  </div>
                  <button className="text-button">View all</button>
                </div>
                <div className="transaction-list">
                  {recentTransactions.map((transaction) => (
                    <div className="transaction-row" key={`${transaction.merchant}-${transaction.time}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="transaction-icon" style={{ "--tile": transaction.color } as React.CSSProperties}>
                          {transaction.direction === "in" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--ink-strong)]">{transaction.merchant}</p>
                          <p className="truncate font-mono text-[11px] text-[var(--muted)]">{transaction.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={transaction.amount > 0 ? "amount-positive" : "amount-negative"}>{formatMoney(transaction.amount)}</p>
                        <p className="font-mono text-[11px] text-[var(--muted)]">{transaction.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid min-w-0 auto-rows-min gap-0">
              <div className="grid grid-cols-1 border-b border-[var(--line)] lg:grid-cols-2 2xl:grid-cols-3">
                <article className="panel min-h-[210px] lg:border-r lg:border-[var(--line)]">
                  <div className="panel-header">
                    <div>
                      <p className="panel-label">Total spending</p>
                      <h2 className="panel-title">{formatMoney(-dashboardModel.cashflow.outflow)}</h2>
                    </div>
                    <span className="period-control">This week</span>
                  </div>
                  <CategoryBars transactions={transactionRows} />
                </article>
                <article className="panel min-h-[210px] border-t border-[var(--line)] lg:border-r lg:border-t-0">
                  <div className="panel-header">
                    <div>
                      <p className="panel-label">Savings</p>
                      <h2 className="panel-title">{formatMoney(Math.max(dashboardModel.netCashflow, 0))}</h2>
                    </div>
                    <span className="period-control">This year</span>
                  </div>
                  <AreaLine tone="coral" />
                </article>
                <article className="panel min-h-[210px] border-t border-[var(--line)] lg:border-t-0">
                  <div className="panel-header">
                    <div>
                      <p className="panel-label">Net worth</p>
                      <h2 className="panel-title">{formatMoney(dashboardModel.position.assets - dashboardModel.position.liabilities)}</h2>
                    </div>
                    <span className="period-control">This year</span>
                  </div>
                  <AreaLine tone="green" />
                </article>
              </div>

              <article className="panel min-h-[500px]">
                <div className="panel-header">
                  <div>
                    <p className="panel-label">Cashflow</p>
                    <h2 className="panel-title">{cashflowTitle}</h2>
                  </div>
                  <div className="segmented" aria-label="Cashflow range">
                    <button>Day</button>
                    <button>Week</button>
                    <button>Month</button>
                    <button className="active">Year</button>
                  </div>
                </div>
                <StackedBarChart transactions={transactionRows} />
              </article>

              <section className="grid grid-cols-1 border-t border-[var(--line)] md:grid-cols-3">
                {dashboardModel.activity.map((item) => (
                  <article className="summary-cell" key={item.label}>
                    <div className="flex items-center gap-3">
                      <div className="summary-icon">
                        {item.kind === "cash" ? <Banknote size={17} /> : item.kind === "rule" ? <Layers3 size={17} /> : <ShieldCheck size={17} />}
                      </div>
                      <div>
                        <p className="panel-label">{item.label}</p>
                        <p className="mt-1 text-sm text-[var(--ink-strong)]">{item.value}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </section>
          </div>
        </section>
    </AppShell>
  );
}

type DatabaseAccount = {
  id: string;
  name: string;
  institution: string | null;
  mask: string | null;
  type: string;
  assetClass: "asset" | "liability";
  currency: string;
  isHidden: boolean;
  closedOn: string | null;
  isActive: boolean;
  updatedAt?: string | Date;
};

type DatabaseSnapshot = {
  id: string;
  ledgerId: string;
  accountId: string;
  accountName: string;
  asOfDate: string;
  balanceMinor: number;
  currency: string;
  source: string;
  createdAt: string;
};

function toAccountRow(account: DatabaseAccount, snapshots: DatabaseSnapshot[] = []): AccountRow {
  const latestSnapshot = snapshots
    .filter((snapshot) => snapshot.accountId === account.id)
    .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate))[0];

  return {
    id: account.id,
    name: account.name,
    institution: account.institution ?? "Manual",
    mask: account.mask ?? "0000",
    type: account.type,
    assetClass: account.assetClass,
    currency: account.currency,
    balanceMinor: latestSnapshot?.balanceMinor ?? 0,
    lastActivity: latestSnapshot ? `Snapshot ${latestSnapshot.asOfDate}` : account.updatedAt ? "Updated" : "No snapshot",
    status: account.closedOn || !account.isActive ? "closed" : account.isHidden ? "hidden" : "active",
  };
}

function MiniLine({ trend, tone }: { trend: number[]; tone: "green" | "coral" | "violet" }) {
  const max = Math.max(...trend);
  const points = trend
    .map((value, index) => `${(index / (trend.length - 1)) * 100},${100 - (value / max) * 82}`)
    .join(" ");

  return (
    <svg className={`mini-line mini-line-${tone}`} viewBox="0 0 100 100" role="img" aria-label="Trend line">
      <polyline points={points} />
    </svg>
  );
}

const categoryColors = ["#8c50d5", "#57b89d", "#d5b96a", "#3f8cc8", "#d76b64"];

function CategoryBars({ transactions }: { transactions: TransactionRow[] }) {
  const rows = buildCategoryShares(transactions);
  const items = rows.length > 0 ? rows : categoryBars;

  return (
    <div className="category-bars">
      {items.map((item) => (
        <div className="category-bar" key={item.label}>
          <span>{item.share}%</span>
          <div>
            <i style={{ height: `${item.share * 1.8}px`, background: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AreaLine({ tone }: { tone: "green" | "coral" }) {
  const points = lineSeries.map((value, index) => `${36 + index * 42},${150 - value}`).join(" ");
  const area = `36,160 ${points} ${36 + (lineSeries.length - 1) * 42},160`;
  return (
    <svg className={`area-line area-line-${tone}`} viewBox="0 0 300 180" role="img" aria-label="Yearly trend">
      <polygon points={area} />
      <polyline points={points} />
      {["JAN", "FEB", "MAR", "APR", "MAY", "JUN"].map((label, index) => (
        <text key={label} x={36 + index * 42} y="174">
          {label}
        </text>
      ))}
    </svg>
  );
}

function StackedBarChart({ transactions }: { transactions: TransactionRow[] }) {
  const chart = buildMonthlySpending(transactions);
  const chartRows = chart.length > 0 ? chart : bars;

  return (
    <div className="chart-shell">
      <div className="chart-grid" aria-hidden="true">
        {[1200, 1000, 800, 600, 400, 200, 0].map((tick) => (
          <span key={tick}>${tick.toLocaleString()}</span>
        ))}
      </div>
      <div className="bar-stage">
        {chartRows.map((bar) => (
          <div className="month-bar" key={bar.month}>
            <div className="bar-stack" style={{ height: `${bar.total}px` }}>
              {bar.parts.map((part) => (
                <i key={`${bar.month}-${part.color}`} style={{ height: `${part.value}%`, background: part.color }} />
              ))}
            </div>
            <span>{bar.month}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span style={{ "--dot": "#6d55a4" } as React.CSSProperties}>Expenses</span>
        <span style={{ "--dot": "#4c9b8b" } as React.CSSProperties}>Transfers</span>
        <span style={{ "--dot": "#d86b62" } as React.CSSProperties}>Subscriptions</span>
        <span style={{ "--dot": "#d9b96c" } as React.CSSProperties}>Grocery</span>
        <span style={{ "--dot": "#2f86c4" } as React.CSSProperties}>Shopping</span>
      </div>
    </div>
  );
}

function buildCategoryShares(transactions: TransactionRow[]) {
  const byCategory = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.status === "excluded" || transaction.category === "Internal Transfer" || transaction.amountMinor >= 0) {
      continue;
    }

    byCategory.set(transaction.category, (byCategory.get(transaction.category) ?? 0) + Math.abs(transaction.amountMinor));
  }

  const total = [...byCategory.values()].reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return [];
  }

  return [...byCategory.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, amount], index) => ({
      label,
      share: Math.max(1, Math.round((amount / total) * 100)),
      color: categoryColors[index % categoryColors.length],
    }));
}

function buildMonthlySpending(transactions: TransactionRow[]) {
  const byMonth = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    if (transaction.status === "excluded" || transaction.category === "Internal Transfer" || transaction.amountMinor >= 0) {
      continue;
    }

    const month = new Date(`${transaction.date}T00:00:00`).toLocaleString("en-US", { month: "short" }).toUpperCase();
    const categoryMap = byMonth.get(month) ?? new Map<string, number>();
    categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + Math.abs(transaction.amountMinor));
    byMonth.set(month, categoryMap);
  }

  const monthlyTotals = [...byMonth.values()].map((categoryMap) => [...categoryMap.values()].reduce((sum, value) => sum + value, 0));
  const maxTotal = Math.max(...monthlyTotals, 1);

  return [...byMonth.entries()].map(([month, categoryMap]) => {
    const total = [...categoryMap.values()].reduce((sum, value) => sum + value, 0);

    return {
      month,
      total: Math.max(18, Math.round((total / maxTotal) * 320)),
      parts: [...categoryMap.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([, amount], index) => ({
          value: Math.max(6, Math.round((amount / total) * 100)),
          color: categoryColors[index % categoryColors.length],
        })),
    };
  });
}

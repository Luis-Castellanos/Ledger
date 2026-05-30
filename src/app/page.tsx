"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Download, Info, Layers3, Link2, Plus, Search, Upload, WalletCards } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { bars, categoryBars, lineSeries, transactions as sampleDashboardTransactions } from "@/lib/sample-data";
import { sampleAccounts, type AccountRow } from "@/lib/finance/account-sample-data";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { formatMoney } from "@/lib/finance/money";
import { demoFallback, fallbackDataSource, type DataSourceState } from "@/lib/demo-fallback";

export default function Home() {
  const [accountRows, setAccountRows] = useState<AccountRow[]>(() => demoFallback(sampleAccounts, []));
  const [transactionRows, setTransactionRows] = useState<TransactionRow[]>(() => demoFallback(sampleTransactionRows, []));
  const [snapshotRows, setSnapshotRows] = useState<DatabaseSnapshot[]>([]);
  const [dataSource, setDataSource] = useState<DataSourceState>(() => fallbackDataSource());
  const [query, setQuery] = useState("");

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
          setAccountRows(demoFallback(sampleAccounts, []));
          setTransactionRows(demoFallback(sampleTransactionRows, []));
          setSnapshotRows([]);
          setDataSource(fallbackDataSource());
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
        if (isCashflowExcluded(transaction)) {
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

    const activity = [
      { label: "Snapshot coverage", value: `${snapshotCoverage}% of accounts`, kind: "cash" },
      { label: "Review queue", value: `${cashflow.review} transactions`, kind: "rule" },
      { label: "Tracked accounts", value: `${accountRows.length} accounts`, kind: "shield" },
    ];

    return { cashflow, netCashflow, position, snapshotCoverage, activity };
  }, [accountRows, snapshotRows, transactionRows]);

  const recentTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows =
      dataSource === "demo"
        ? sampleDashboardTransactions
        : transactionRows.slice(0, 8).map((transaction) => ({
            merchant: transaction.merchant,
            time: `${transaction.date} / ${transaction.account}`,
            amount: transaction.amountMinor,
            category: transaction.category,
            direction: transaction.amountMinor > 0 ? "in" : "out",
            color: transaction.amountMinor > 0 ? "#57b89d" : "#d76b64",
          }));

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((transaction) =>
      [transaction.merchant, transaction.time, transaction.category].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [dataSource, query, transactionRows]);

  const cashflowTitle = useMemo(() => {
    const outflow = transactionRows.reduce((total, transaction) => {
      if (isCashflowExcluded(transaction) || transaction.amountMinor > 0) {
        return total;
      }

      return total + Math.abs(transaction.amountMinor);
    }, 0);

    return `${formatMoney(-outflow)} spent`;
  }, [transactionRows]);

  const netWorth = dashboardModel.position.assets - dashboardModel.position.liabilities;
  const visibleAccounts = accountRows.filter((account) => account.status !== "closed").slice(0, 5);
  const updatedAtLabel = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <AppShell active="Dashboard">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header px-5 pb-0 pt-5 lg:px-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Personal finance</p>
              <h1 className="mt-1 text-[34px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">All accounts</h1>
            </div>
            <div className="flex items-center gap-2">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search ledger" placeholder="Search ledger" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <ExportButton className="icon-button" aria-label="Export backup package" format="backup_package">
                <Download size={17} />
              </ExportButton>
            </div>
          </div>
          <div className="fidelity-action-bar">
            <Link className="fidelity-pill" href="/transactions">
              <Banknote size={16} />
              Transactions
            </Link>
            <Link className="fidelity-pill" href="/imports">
              <Upload size={16} />
              Import
            </Link>
            <Link className="fidelity-pill" href="/accounts">
              <WalletCards size={16} />
              Accounts
            </Link>
            <Link className="fidelity-pill" href="/review">
              <Layers3 size={16} />
              Review
            </Link>
          </div>
          <nav className="page-tabs" aria-label="Dashboard sections">
            <Link className="active" href="/">
              Summary
            </Link>
            <Link href="/transactions">Activity</Link>
            <Link href="/accounts">Balances</Link>
            <Link href="/cashflow">Cashflow</Link>
            <Link href="/net-worth">Net Worth</Link>
          </nav>
        </header>

        <div className="fidelity-dashboard-shell">
          <aside className="fidelity-account-rail" aria-label="Accounts overview">
            <div className="fidelity-rail-header">
              <div>
                <h2>Accounts</h2>
                <p>As of {updatedAtLabel}</p>
              </div>
              <Link className="table-icon-button" href="/accounts" aria-label="Manage accounts">
                <WalletCards size={17} />
              </Link>
            </div>

            <Link className="fidelity-total-row" href="/accounts">
              <span>All accounts</span>
              <strong>{formatMoney(netWorth)}</strong>
            </Link>

            <div className="fidelity-account-group">
              <div className="fidelity-account-row fidelity-account-row-muted">
                <span>Assets</span>
                <strong>{formatMoney(dashboardModel.position.assets)}</strong>
              </div>
              {visibleAccounts.map((account) => (
                <Link className="fidelity-account-row" href="/accounts" key={account.id}>
                  <span>
                    {account.name}
                    <small>{account.institution} {account.mask ? `...${account.mask}` : ""}</small>
                  </span>
                  <strong>{formatMoney(account.balanceMinor)}</strong>
                </Link>
              ))}
              {dashboardModel.position.liabilities > 0 ? (
                <div className="fidelity-account-row">
                  <span>Liabilities</span>
                  <strong>{formatMoney(-dashboardModel.position.liabilities)}</strong>
                </div>
              ) : null}
            </div>

            <div className="fidelity-rail-actions">
              <Link href="/accounts">
                <Plus size={18} />
                Add account
              </Link>
              <Link href="/imports">
                <Link2 size={17} />
                Link or import data
              </Link>
            </div>
          </aside>

          <section className="fidelity-dashboard-content">
            <div className="fidelity-content-grid">
              <article className="fidelity-card fidelity-balance-card">
                <div className="fidelity-card-header">
                  <div>
                    <p className="panel-label">Balance</p>
                    <h2>{formatMoney(netWorth)}</h2>
                    <p className="fidelity-gain-line">
                      <span>{formatMoney(dashboardModel.netCashflow)}</span>
                      Net cashflow
                    </p>
                  </div>
                  <Info size={19} />
                </div>
                <AreaLine tone={dashboardModel.netCashflow >= 0 ? "green" : "coral"} />
                <div className="fidelity-range-control" aria-label="Chart range">
                  <span>1M</span>
                  <span>YTD</span>
                  <strong>1Y</strong>
                  <span>3Y</span>
                </div>
                <Link className="fidelity-underlink" href="/net-worth">
                  View your performance
                </Link>
              </article>

              <div className="fidelity-card-stack">
                <article className="fidelity-card fidelity-compact-card">
                  <h2>Review queue</h2>
                  <p>{dashboardModel.cashflow.review} transactions need categorization or approval.</p>
                  <Link className="fidelity-underlink" href="/review">
                    View review workbench
                  </Link>
                </article>
                <article className="fidelity-card fidelity-compact-card">
                  <h2>Cashflow summary</h2>
                  <CategoryBars transactions={transactionRows} />
                </article>
              </div>
            </div>

            <section className="fidelity-card fidelity-wide-card">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Cashflow</p>
                  <h2 className="panel-title">{cashflowTitle}</h2>
                </div>
                <span className="period-control">Year</span>
              </div>
              <StackedBarChart transactions={transactionRows} />
            </section>

            <section className="fidelity-card fidelity-wide-card">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Transactions</p>
                  <h2 className="panel-title">Recent activity</h2>
                </div>
                <Link className="text-button" href="/transactions">
                  View all
                </Link>
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

function isCashflowExcluded(transaction: TransactionRow) {
  return transaction.status === "excluded" || transaction.transferStatus === "transfer" || transaction.category === "Internal Transfer";
}

function buildCategoryShares(transactions: TransactionRow[]) {
  const byCategory = new Map<string, number>();

  for (const transaction of transactions) {
    if (isCashflowExcluded(transaction) || transaction.amountMinor >= 0) {
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
    if (isCashflowExcluded(transaction) || transaction.amountMinor >= 0) {
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, Landmark, ReceiptText } from "lucide-react";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { formatMoney } from "@/lib/finance/money";

export function CashflowWorkbench() {
  const [transactions, setTransactions] = useState<TransactionRow[]>(sampleTransactionRows);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const response = await fetch("/api/transactions", { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error("Transaction API unavailable");
        }

        const payload = (await response.json()) as { transactions: TransactionRow[] };

        if (isMounted) {
          setTransactions(payload.transactions);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setTransactions(sampleTransactionRows);
          setDataSource("demo");
        }
      }
    }

    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.status === "excluded" || transaction.transferStatus === "transfer" || transaction.category === "Internal Transfer") {
          acc.excluded += 1;
          return acc;
        }

        if (transaction.amountMinor > 0) {
          acc.inflow += transaction.amountMinor;
        } else {
          acc.outflow += Math.abs(transaction.amountMinor);
        }

        acc.byCategory.set(transaction.category, (acc.byCategory.get(transaction.category) ?? 0) + transaction.amountMinor);
        return acc;
      },
      { inflow: 0, outflow: 0, excluded: 0, byCategory: new Map<string, number>() },
    );
  }, [transactions]);

  const categoryRows = [...summary.byCategory.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <CashflowMetric label="Inflow" value={formatMoney(summary.inflow)} icon={<ArrowDownLeft size={17} />} tone="green" href="/transactions?direction=inflow" />
          <CashflowMetric label="Outflow" value={formatMoney(-summary.outflow)} icon={<ArrowUpRight size={17} />} tone="coral" href="/transactions?direction=outflow" />
          <CashflowMetric label="Net cashflow" value={formatMoney(summary.inflow - summary.outflow)} icon={<BadgeDollarSign size={17} />} tone="violet" href="/transactions?transfer=none" />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Cashflow</p>
              <h2 className="panel-title">Category movement</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
          </div>
          <div className="cashflow-bars" aria-label="Cashflow by category">
            {categoryRows.map(([category, amount]) => (
              <a className="cashflow-row report-drilldown" href={`/transactions?category=${encodeURIComponent(category)}`} key={category}>
                <span>{category}</span>
                <div>
                  <i style={{ width: `${Math.max(8, (Math.abs(amount) / Math.max(summary.inflow, summary.outflow, 1)) * 100)}%` }} />
                </div>
                <strong className={amount < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(amount)}</strong>
              </a>
            ))}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="account-checklist-item">
            <ReceiptText size={17} />
            <span>Excluded transactions are omitted from operating flow.</span>
          </div>
          <div className="account-checklist-item">
            <Landmark size={17} />
            <span>Internal transfers are kept in the ledger and removed from cashflow.</span>
          </div>
          <div className="account-checklist-item">
            <BadgeDollarSign size={17} />
            <span>Signed transaction amounts remain the source of truth.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

function CashflowMetric({
  label,
  value,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "green" | "coral" | "violet";
  href: string;
}) {
  return (
    <a className="stat-panel account-metric report-drilldown" href={href}>
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </a>
  );
}

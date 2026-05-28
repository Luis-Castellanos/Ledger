"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleSlash, Plus, ReceiptText, Save, Search } from "lucide-react";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { sampleTransactionRows, type TransactionRow, type TransactionStatus } from "@/lib/finance/transaction-sample-data";
import { formatMoney, parseDollarAmount } from "@/lib/finance/money";

const categories = defaultCategoryTree.flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)]);
const statuses = [
  { label: "Needs review", value: "needs_review" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Excluded", value: "excluded" },
] satisfies { label: string; value: TransactionStatus }[];

export function TransactionsWorkbench() {
  const [transactions, setTransactions] = useState<TransactionRow[]>(sampleTransactionRows);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    merchant: "",
    account: sampleAccounts[0]?.name ?? "",
    category: "Groceries",
    amount: "",
  });

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [transaction.merchant, transaction.account, transaction.category, transaction.date].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, transactions]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        if (transaction.status === "excluded") {
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
  }, [transactions]);

  function updateStatus(id: string, status: TransactionStatus) {
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, status } : transaction)));
  }

  function updateCategory(id: string, category: string) {
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, category } : transaction)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const amountMinor = parseDollarAmount(formState.amount);

      if (!formState.merchant.trim() || !formState.account || !formState.category) {
        setError("Merchant, account, category, and amount are required.");
        return;
      }

      setTransactions((current) => [
        {
          id: `local_${Date.now()}`,
          date: formState.date,
          merchant: formState.merchant.trim(),
          account: formState.account,
          category: formState.category,
          amountMinor,
          status: "needs_review",
        },
        ...current,
      ]);
      setFormState({ date: new Date().toISOString().slice(0, 10), merchant: "", account: sampleAccounts[0]?.name ?? "", category: "Groceries", amount: "" });
      setError(null);
    } catch {
      setError("Enter a valid signed dollar amount.");
    }
  }

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <TransactionMetric label="Inflow" value={formatMoney(totals.inflow)} icon={<ArrowDownLeft size={17} />} tone="green" />
          <TransactionMetric label="Outflow" value={formatMoney(-totals.outflow)} icon={<ArrowUpRight size={17} />} tone="coral" />
          <TransactionMetric label="Review queue" value={`${totals.review} rows`} icon={<CheckCircle2 size={17} />} tone="violet" />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Transactions</p>
              <h2 className="panel-title">Register</h2>
            </div>
            <div className="transaction-controls">
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Search transactions"
                  placeholder="Search transactions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select aria-label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option value={status.value} key={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="transactions-table" role="table" aria-label="Transactions">
            <div className="transactions-table-head" role="row">
              <span>Merchant</span>
              <span>Category</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {filteredTransactions.map((transaction) => (
              <div className="transactions-table-row" role="row" key={transaction.id}>
                <div className="transaction-register-name">
                  <p>{transaction.merchant}</p>
                  <span>
                    {transaction.date} • {transaction.account}
                  </span>
                </div>
                <select
                  aria-label={`Category for ${transaction.merchant}`}
                  value={transaction.category}
                  onChange={(event) => updateCategory(transaction.id, event.target.value)}
                >
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Status for ${transaction.merchant}`}
                  value={transaction.status}
                  onChange={(event) => updateStatus(transaction.id, event.target.value as TransactionStatus)}
                >
                  {statuses.map((status) => (
                    <option value={status.value} key={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <strong className={transaction.amountMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(transaction.amountMinor)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Manual entry</p>
              <h2 className="panel-title">Add transaction</h2>
            </div>
            <div className="summary-icon">
              <Plus size={17} />
            </div>
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <label>
              <span>Date</span>
              <input type="date" required value={formState.date} onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Merchant</span>
              <input
                required
                value={formState.merchant}
                onChange={(event) => setFormState((current) => ({ ...current, merchant: event.target.value }))}
                placeholder="Trader Joe's"
              />
            </label>
            <label>
              <span>Account</span>
              <select value={formState.account} onChange={(event) => setFormState((current) => ({ ...current, account: event.target.value }))}>
                {sampleAccounts.map((account) => (
                  <option value={account.name} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Category</span>
              <select value={formState.category} onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}>
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Amount</span>
              <input
                required
                value={formState.amount}
                onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))}
                placeholder="-42.18"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-action" type="submit">
              <Save size={16} />
              Save transaction
            </button>
          </form>
        </section>

        <section className="panel account-form-panel">
          <div className="account-checklist-item">
            <ReceiptText size={17} />
            <span>Every transaction remains tied to one account source.</span>
          </div>
          <div className="account-checklist-item">
            <CheckCircle2 size={17} />
            <span>Review status is explicit before reporting trusts the row.</span>
          </div>
          <div className="account-checklist-item">
            <CircleSlash size={17} />
            <span>Excluded rows stay visible without affecting totals.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

function TransactionMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

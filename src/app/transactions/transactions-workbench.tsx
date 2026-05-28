"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleSlash, Plus, ReceiptText, Save, Search } from "lucide-react";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { sampleTransactionRows, type TransactionRow, type TransactionStatus } from "@/lib/finance/transaction-sample-data";
import { createManualTransactionSchema } from "@/lib/finance/transaction";
import { formatMoney, parseDollarAmount } from "@/lib/finance/money";

const categories = defaultCategoryTree.flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)]);
const statuses = [
  { label: "Needs review", value: "needs_review" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Excluded", value: "excluded" },
] satisfies { label: string; value: TransactionStatus }[];

export function TransactionsWorkbench() {
  const [transactions, setTransactions] = useState<TransactionRow[]>(sampleTransactionRows);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>(sampleAccounts.map((account) => ({ id: account.name, name: account.name })));
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    merchant: "",
    accountId: sampleAccounts[0]?.name ?? "",
    category: "Groceries",
    amount: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseData() {
      try {
        const [accountsResponse, transactionsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
        ]);

        if (!accountsResponse.ok || !transactionsResponse.ok) {
          throw new Error("Transaction API unavailable");
        }

        const accountsPayload = (await accountsResponse.json()) as { accounts: DatabaseAccount[] };
        const transactionsPayload = (await transactionsResponse.json()) as { transactions: TransactionRow[] };
        const nextAccounts = accountsPayload.accounts.map((account) => ({ id: account.id, name: account.name }));

        if (isMounted && !hasLocalEdits.current) {
          setAccountOptions(nextAccounts.length > 0 ? nextAccounts : sampleAccounts.map((account) => ({ id: account.name, name: account.name })));
          setTransactions(transactionsPayload.transactions);
          setFormState((current) => ({ ...current, accountId: nextAccounts[0]?.id ?? current.accountId }));
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setDataSource("demo");
        }
      }
    }

    void loadDatabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function updateStatus(id: string, status: TransactionStatus) {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, status } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({ id, reviewStatus: status });
    }
  }

  async function updateCategory(id: string, category: string) {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, category } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({ id, categoryName: category });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const parsed = createManualTransactionSchema.parse({
        date: formState.date,
        accountId: formState.accountId,
        merchant: formState.merchant,
        categoryName: formState.category,
        amount: formState.amount,
      });
      const accountName = accountOptions.find((account) => account.id === formState.accountId)?.name ?? formState.accountId;

      if (!formState.merchant.trim() || !formState.accountId || !formState.category) {
        setError("Merchant, account, category, and amount are required.");
        return;
      }

      setIsSaving(true);
      hasLocalEdits.current = true;

      if (dataSource === "database") {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...parsed, amount: formState.amount }),
        });

        if (response.ok) {
          const payload = (await response.json()) as { transaction: TransactionRow };
          setTransactions((current) => [payload.transaction, ...current]);
          setFormState({ date: new Date().toISOString().slice(0, 10), merchant: "", accountId: formState.accountId, category: "Groceries", amount: "" });
          setError(null);
          return;
        }
      }

      const amountMinor = parseDollarAmount(formState.amount);
      setTransactions((current) => [
        {
          id: `local_${Date.now()}`,
          date: formState.date,
          merchant: formState.merchant.trim(),
          account: accountName,
          category: formState.category,
          amountMinor,
          status: "needs_review",
        },
        ...current,
      ]);
      setDataSource("demo");
      setFormState({ date: new Date().toISOString().slice(0, 10), merchant: "", accountId: accountOptions[0]?.id ?? "", category: "Groceries", amount: "" });
      setError(dataSource === "database" ? "Saved in local demo mode because the transaction API rejected the write." : null);
    } catch {
      setError("Enter a valid signed dollar amount.");
    } finally {
      setIsSaving(false);
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
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
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
              <select value={formState.accountId} onChange={(event) => setFormState((current) => ({ ...current, accountId: event.target.value }))}>
                {accountOptions.map((account) => (
                  <option value={account.id} key={account.id}>
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
              {isSaving ? "Saving" : "Save transaction"}
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

type DatabaseAccount = {
  id: string;
  name: string;
};

type AccountOption = {
  id: string;
  name: string;
};

async function persistTransactionPatch(body: { id: string; reviewStatus?: TransactionStatus; categoryName?: string }) {
  try {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // The optimistic UI remains usable in demo or temporarily offline states.
  }
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

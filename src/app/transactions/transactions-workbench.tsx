"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleSlash, Plus, ReceiptText, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { sampleTransactionRows, type TransactionRow, type TransactionStatus } from "@/lib/finance/transaction-sample-data";
import { createManualTransactionSchema } from "@/lib/finance/transaction";
import { formatMoney, parseDollarAmount } from "@/lib/finance/money";

const categories = defaultCategoryTree.flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)]);
const fallbackCategoryOptions = categories.map((name) => ({ id: name, name }));
const statuses = [
  { label: "Needs review", value: "needs_review" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Excluded", value: "excluded" },
] satisfies { label: string; value: TransactionStatus }[];
const transferStatuses = [
  { label: "Operating", value: "none" },
  { label: "Transfer", value: "transfer" },
] satisfies { label: string; value: NonNullable<TransactionRow["transferStatus"]> }[];

export function TransactionsWorkbench() {
  const [transactions, setTransactions] = useState<TransactionRow[]>(sampleTransactionRows);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>(sampleAccounts.map((account) => ({ id: account.name, name: account.name })));
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(fallbackCategoryOptions);
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [transferFilter, setTransferFilter] = useState<"all" | NonNullable<TransactionRow["transferStatus"]>>("all");
  const [error, setError] = useState<string | null>(null);
  const [lastDeletedTransaction, setLastDeletedTransaction] = useState<TransactionRow | null>(null);
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
        const [accountsResponse, transactionsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
          fetch("/api/categories", { headers: { Accept: "application/json" } }),
        ]);

        if (!accountsResponse.ok || !transactionsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Transaction API unavailable");
        }

        const accountsPayload = (await accountsResponse.json()) as { accounts: DatabaseAccount[] };
        const transactionsPayload = (await transactionsResponse.json()) as { transactions: TransactionRow[] };
        const categoriesPayload = (await categoriesResponse.json()) as { categories: DatabaseCategory[] };
        const nextAccounts = accountsPayload.accounts.map((account) => ({ id: account.id, name: account.name }));
        const nextCategories = categoriesPayload.categories.map((category) => ({ id: category.id, name: category.name }));

        if (isMounted && !hasLocalEdits.current) {
          setAccountOptions(nextAccounts.length > 0 ? nextAccounts : sampleAccounts.map((account) => ({ id: account.name, name: account.name })));
          setCategoryOptions(nextCategories.length > 0 ? nextCategories : fallbackCategoryOptions);
          setTransactions(transactionsPayload.transactions);
          setFormState((current) => ({
            ...current,
            accountId: nextAccounts[0]?.id ?? current.accountId,
            category: getDefaultCategoryName(nextCategories, current.category),
          }));
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
      const matchesAccount = accountFilter === "all" || transaction.account === accountFilter;
      const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesTransfer = transferFilter === "all" || (transaction.transferStatus ?? "none") === transferFilter;
      const matchesQuery =
        !normalizedQuery ||
        [transaction.merchant, transaction.account, transaction.category, transaction.date].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesStatus && matchesAccount && matchesCategory && matchesTransfer && matchesQuery;
    });
  }, [accountFilter, categoryFilter, query, statusFilter, transactions, transferFilter]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        if (transaction.status === "excluded" || transaction.transferStatus === "transfer") {
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

  async function updateTransferStatus(id: string, transferStatus: NonNullable<TransactionRow["transferStatus"]>) {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, transferStatus } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({ id, transferStatus });
    }
  }

  async function deleteTransaction(id: string) {
    const transaction = transactions.find((row) => row.id === id);

    if (!transaction) {
      return;
    }

    hasLocalEdits.current = true;
    setLastDeletedTransaction(transaction);
    setTransactions((current) => current.filter((row) => row.id !== id));

    if (dataSource === "database") {
      await persistTransactionPatch({ id, action: "delete" });
    }
  }

  async function restoreLastDeletedTransaction() {
    if (!lastDeletedTransaction) {
      return;
    }

    hasLocalEdits.current = true;
    setTransactions((current) => [lastDeletedTransaction, ...current]);
    setLastDeletedTransaction(null);

    if (dataSource === "database") {
      await persistTransactionPatch({ id: lastDeletedTransaction.id, action: "restore" });
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
          setFormState({
            date: new Date().toISOString().slice(0, 10),
            merchant: "",
            accountId: formState.accountId,
            category: getDefaultCategoryName(categoryOptions, formState.category),
            amount: "",
          });
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
          transferStatus: "none",
        },
        ...current,
      ]);
      setDataSource("demo");
      setFormState({
        date: new Date().toISOString().slice(0, 10),
        merchant: "",
        accountId: accountOptions[0]?.id ?? "",
        category: getDefaultCategoryName(categoryOptions, formState.category),
        amount: "",
      });
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
              <select aria-label="Account filter" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
                <option value="all">All accounts</option>
                {accountOptions.map((account) => (
                  <option value={account.name} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select aria-label="Category filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option value={category.name} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Transfer filter"
                value={transferFilter}
                onChange={(event) => setTransferFilter(event.target.value as typeof transferFilter)}
              >
                <option value="all">All movement</option>
                {transferStatuses.map((status) => (
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
              <span>Status / transfer</span>
              <span>Amount</span>
            </div>
            {lastDeletedTransaction ? (
              <div className="transaction-undo-banner">
                <span>{lastDeletedTransaction.merchant} deleted.</span>
                <button type="button" onClick={restoreLastDeletedTransaction}>
                  <RotateCcw size={14} />
                  Restore
                </button>
              </div>
            ) : null}
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
                  {categoryOptions.map((category) => (
                    <option value={category.name} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="transaction-status-stack">
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
                  <select
                    aria-label={`Transfer status for ${transaction.merchant}`}
                    value={transaction.transferStatus ?? "none"}
                    onChange={(event) => updateTransferStatus(transaction.id, event.target.value as NonNullable<TransactionRow["transferStatus"]>)}
                  >
                    {transferStatuses.map((status) => (
                      <option value={status.value} key={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="transaction-amount-actions">
                  <strong className={transaction.amountMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(transaction.amountMinor)}</strong>
                  <button type="button" aria-label={`Delete ${transaction.merchant}`} onClick={() => deleteTransaction(transaction.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
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
                {categoryOptions.map((category) => (
                  <option value={category.name} key={category.id}>
                    {category.name}
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

type DatabaseCategory = {
  id: string;
  name: string;
};

type AccountOption = {
  id: string;
  name: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

function getDefaultCategoryName(options: CategoryOption[], currentCategory = "Groceries") {
  return options.find((category) => category.name === currentCategory)?.name ?? options.find((category) => category.name === "Groceries")?.name ?? options[0]?.name ?? "Groceries";
}

async function persistTransactionPatch(body: {
  id: string;
  reviewStatus?: TransactionStatus;
  transferStatus?: NonNullable<TransactionRow["transferStatus"]>;
  categoryName?: string;
  action?: "delete" | "restore";
}) {
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

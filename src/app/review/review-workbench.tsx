"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleSlash, ListChecks, Search, Tag } from "lucide-react";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { formatMoney } from "@/lib/finance/money";

const categories = defaultCategoryTree.flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)]);
const fallbackCategoryOptions = categories.map((name) => ({ id: name, name }));

export function ReviewWorkbench() {
  const [transactions, setTransactions] = useState<TransactionRow[]>(sampleTransactionRows);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(fallbackCategoryOptions);
  const [query, setQuery] = useState("");
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [message, setMessage] = useState<string | null>(null);
  const hasLocalEdits = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const [transactionsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
          fetch("/api/categories", { headers: { Accept: "application/json" } }),
        ]);

        if (!transactionsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Transaction API unavailable");
        }

        const transactionsPayload = (await transactionsResponse.json()) as { transactions: TransactionRow[] };
        const categoriesPayload = (await categoriesResponse.json()) as { categories: DatabaseCategory[] };
        const nextCategories = categoriesPayload.categories.map((category) => ({ id: category.id, name: category.name }));

        if (isMounted && !hasLocalEdits.current) {
          setTransactions(transactionsPayload.transactions);
          setCategoryOptions(nextCategories.length > 0 ? nextCategories : fallbackCategoryOptions);
          setDataSource("database");
        }
      } catch {
        if (isMounted && !hasLocalEdits.current) {
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

  const reviewRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const needsReview = transaction.status === "needs_review";
      const matchesQuery =
        !normalizedQuery ||
        [transaction.merchant, transaction.account, transaction.category, transaction.date].some((value) => value.toLowerCase().includes(normalizedQuery));

      return needsReview && matchesQuery;
    });
  }, [query, transactions]);

  const reviewedCount = transactions.filter((transaction) => transaction.status === "reviewed").length;
  const excludedCount = transactions.filter((transaction) => transaction.status === "excluded").length;

  async function updateReview(id: string, status: "reviewed" | "excluded") {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, status } : transaction)));

    if (dataSource === "database") {
      try {
        const response = await fetch("/api/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id, reviewStatus: status }),
        });

        if (!response.ok) {
          throw new Error("Review update failed");
        }

        setMessage("Review decision saved.");
      } catch {
        setDataSource("demo");
        setMessage("Review decision stayed local because the API was unavailable.");
      }
    } else {
      setMessage(null);
    }
  }

  async function updateCategory(id: string, category: string) {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, category } : transaction)));

    if (dataSource === "database") {
      try {
        const response = await fetch("/api/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id, categoryName: category }),
        });

        if (!response.ok) {
          throw new Error("Category update failed");
        }

        setMessage("Category change saved.");
      } catch {
        setDataSource("demo");
        setMessage("Category change stayed local because the API was unavailable.");
      }
    } else {
      setMessage(null);
    }
  }

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <ReviewMetric label="Needs review" value={`${reviewRows.length} rows`} icon={<ListChecks size={17} />} tone="violet" />
          <ReviewMetric label="Reviewed" value={`${reviewedCount} rows`} icon={<CheckCircle2 size={17} />} tone="green" />
          <ReviewMetric label="Excluded" value={`${excludedCount} rows`} icon={<CircleSlash size={17} />} tone="coral" />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Review queue</p>
              <h2 className="panel-title">Unresolved transactions</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search unresolved transactions" placeholder="Search queue" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>
          {message ? <p className={message.endsWith("saved.") ? "form-success" : "form-error"}>{message}</p> : null}

          <div className="transactions-table" role="table" aria-label="Review queue">
            <div className="transactions-table-head" role="row">
              <span>Merchant</span>
              <span>Category</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {reviewRows.map((transaction) => (
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
                <div className="review-actions">
                  <button type="button" aria-label={`Mark ${transaction.merchant} reviewed`} onClick={() => updateReview(transaction.id, "reviewed")}>
                    <CheckCircle2 size={15} />
                  </button>
                  <button type="button" aria-label={`Exclude ${transaction.merchant}`} onClick={() => updateReview(transaction.id, "excluded")}>
                    <CircleSlash size={15} />
                  </button>
                </div>
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
              <p className="panel-label">Controls</p>
              <h2 className="panel-title">Review policy</h2>
            </div>
            <div className="summary-icon">
              <Tag size={17} />
            </div>
          </div>
          <div className="account-checklist-item">
            <CheckCircle2 size={17} />
            <span>Reviewed transactions are trusted by reports.</span>
          </div>
          <div className="account-checklist-item">
            <CircleSlash size={17} />
            <span>Excluded rows stay visible but leave cashflow totals.</span>
          </div>
          <div className="account-checklist-item">
            <ListChecks size={17} />
            <span>Every decision remains tied to the transaction row.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

type DatabaseCategory = {
  id: string;
  name: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

function ReviewMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

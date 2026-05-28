"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleSlash, GitBranch, ListChecks, Search, Tags, Wand2 } from "lucide-react";
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
  const [lastReviewAction, setLastReviewAction] = useState<ReviewUndoAction | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState(fallbackCategoryOptions[0]?.name ?? "Groceries");
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
          setBulkCategory(nextCategories[0]?.name ?? fallbackCategoryOptions[0]?.name ?? "Groceries");
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
  const selectedReviewRows = reviewRows.filter((transaction) => selectedReviewIds.includes(transaction.id));
  const selectedReviewCount = selectedReviewRows.length;
  const allReviewRowsSelected = reviewRows.length > 0 && selectedReviewCount === reviewRows.length;

  function toggleReviewSelection(id: string) {
    setSelectedReviewIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllReviewSelection() {
    setSelectedReviewIds(allReviewRowsSelected ? [] : reviewRows.map((transaction) => transaction.id));
  }

  async function updateReview(id: string, status: "reviewed" | "excluded") {
    hasLocalEdits.current = true;
    const previousTransaction = transactions.find((transaction) => transaction.id === id);

    if (!previousTransaction) {
      return;
    }

    setLastReviewAction({
      transactions: [{ id, previousStatus: previousTransaction.status }],
      merchant: previousTransaction.merchant,
      nextStatus: status,
    });
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, status } : transaction)));
    setSelectedReviewIds((current) => current.filter((selectedId) => selectedId !== id));

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

        setMessage(`${previousTransaction.merchant} marked ${getReviewStatusLabel(status)}.`);
      } catch {
        setDataSource("demo");
        setMessage("Review decision stayed local because the API was unavailable.");
      }
    } else {
      setMessage(`${previousTransaction.merchant} marked ${getReviewStatusLabel(status)}.`);
    }
  }

  async function applyToSimilar(id: string) {
    hasLocalEdits.current = true;
    const sourceTransaction = transactions.find((transaction) => transaction.id === id);

    if (!sourceTransaction) {
      return;
    }

    const normalizedMerchant = normalizeMerchant(sourceTransaction.merchant);
    const similarTransactions = transactions.filter(
      (transaction) => transaction.status === "needs_review" && normalizeMerchant(transaction.merchant) === normalizedMerchant,
    );

    if (similarTransactions.length === 0) {
      setMessage(`No similar unreviewed ${sourceTransaction.merchant} transactions found.`);
      return;
    }

    const nextStatus = "reviewed";
    setLastReviewAction({
      transactions: similarTransactions.map((transaction) => ({ id: transaction.id, previousStatus: transaction.status })),
      merchant: sourceTransaction.merchant,
      nextStatus,
    });
    setTransactions((current) =>
      current.map((transaction) =>
        similarTransactions.some((similarTransaction) => similarTransaction.id === transaction.id)
          ? { ...transaction, category: sourceTransaction.category, status: nextStatus }
          : transaction,
      ),
    );

    if (dataSource === "database") {
      try {
        await Promise.all(
          similarTransactions.map((transaction) =>
            fetch("/api/transactions", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ id: transaction.id, categoryName: sourceTransaction.category, reviewStatus: nextStatus }),
            }).then((response) => {
              if (!response.ok) {
                throw new Error("Similar review update failed");
              }
            }),
          ),
        );

        setMessage(`${similarTransactions.length} similar ${sourceTransaction.merchant} transactions reviewed.`);
      } catch {
        setDataSource("demo");
        setMessage("Similar review stayed local because the API was unavailable.");
      }
    } else {
      setMessage(`${similarTransactions.length} similar ${sourceTransaction.merchant} transactions reviewed.`);
    }
  }

  async function createRuleFromTransaction(id: string) {
    hasLocalEdits.current = true;
    const transaction = transactions.find((row) => row.id === id);
    const category = transaction ? categoryOptions.find((option) => option.name === transaction.category) : null;

    if (!transaction || !category) {
      setMessage("Choose a category before creating a rule.");
      return;
    }

    if (dataSource !== "database") {
      setMessage(`Rule preview created for ${transaction.merchant}. Configure Clerk and DATABASE_URL to persist rules.`);
      return;
    }

    try {
      const response = await fetch("/api/merchant-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: `${transaction.merchant} rule`,
          matchType: "contains",
          matchValue: transaction.merchant,
          categoryId: category.id,
          priority: 100,
        }),
      });

      if (!response.ok) {
        throw new Error("Rule creation failed");
      }

      setMessage(`Rule created for ${transaction.merchant}.`);
    } catch {
      setDataSource("demo");
      setMessage("Rule creation stayed local because the API was unavailable.");
    }
  }

  async function undoLastReviewAction() {
    if (!lastReviewAction) {
      return;
    }

    hasLocalEdits.current = true;
    const action = lastReviewAction;
    setLastReviewAction(null);
    setTransactions((current) =>
      current.map((transaction) => {
        const previous = action.transactions.find((item) => item.id === transaction.id);
        return previous ? { ...transaction, status: previous.previousStatus } : transaction;
      }),
    );

    if (dataSource === "database") {
      try {
        await Promise.all(
          action.transactions.map((transaction) =>
            fetch("/api/transactions", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ id: transaction.id, reviewStatus: transaction.previousStatus }),
            }).then((response) => {
              if (!response.ok) {
                throw new Error("Review undo failed");
              }
            }),
          ),
        );

        setMessage("Review decision undone.");
      } catch {
        setDataSource("demo");
        setMessage("Review undo stayed local because the API was unavailable.");
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

  async function updateBulkCategory() {
    if (selectedReviewRows.length === 0) {
      return;
    }

    const selectedIds = selectedReviewRows.map((transaction) => transaction.id);
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (selectedIds.includes(transaction.id) ? { ...transaction, category: bulkCategory } : transaction)));

    if (dataSource === "database") {
      try {
        await Promise.all(selectedIds.map((id) => persistReviewPatch({ id, categoryName: bulkCategory })));
        setMessage(`${selectedIds.length} selected transactions recategorized.`);
      } catch {
        setDataSource("demo");
        setMessage("Bulk category change stayed local because the API was unavailable.");
      }
    } else {
      setMessage(`${selectedIds.length} selected transactions recategorized.`);
    }
  }

  async function updateBulkReview(status: "reviewed" | "excluded") {
    if (selectedReviewRows.length === 0) {
      return;
    }

    const selectedRows = selectedReviewRows;
    const selectedIds = selectedRows.map((transaction) => transaction.id);
    hasLocalEdits.current = true;
    setLastReviewAction({
      transactions: selectedRows.map((transaction) => ({ id: transaction.id, previousStatus: transaction.status })),
      merchant: `${selectedRows.length} selected rows`,
      nextStatus: status,
    });
    setTransactions((current) => current.map((transaction) => (selectedIds.includes(transaction.id) ? { ...transaction, status } : transaction)));
    setSelectedReviewIds([]);

    if (dataSource === "database") {
      try {
        await Promise.all(selectedIds.map((id) => persistReviewPatch({ id, reviewStatus: status })));
        setMessage(`${selectedIds.length} selected transactions marked ${getReviewStatusLabel(status)}.`);
      } catch {
        setDataSource("demo");
        setMessage("Bulk review decision stayed local because the API was unavailable.");
      }
    } else {
      setMessage(`${selectedIds.length} selected transactions marked ${getReviewStatusLabel(status)}.`);
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
          {message ? <p className={isReviewSuccessMessage(message) ? "form-success" : "form-error"}>{message}</p> : null}
          {lastReviewAction ? (
            <div className="transaction-undo-banner">
              <span>
                Last review action: {lastReviewAction.merchant} {getReviewStatusLabel(lastReviewAction.nextStatus)}.
              </span>
              <button type="button" onClick={undoLastReviewAction}>
                Undo review
              </button>
            </div>
          ) : null}
          <div className="transaction-undo-banner review-bulk-bar">
            <span>{selectedReviewCount} selected</span>
            <select aria-label="Bulk review category" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}>
              {categoryOptions.map((category) => (
                <option value={category.name} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={updateBulkCategory} disabled={selectedReviewCount === 0}>
              Set category
            </button>
            <button type="button" onClick={() => updateBulkReview("reviewed")} disabled={selectedReviewCount === 0}>
              Mark reviewed
            </button>
            <button type="button" onClick={() => updateBulkReview("excluded")} disabled={selectedReviewCount === 0}>
              Exclude
            </button>
          </div>

          <div className="transactions-table review-queue-table" role="table" aria-label="Review queue">
            <div className="transactions-table-head" role="row">
              <span>
                <input
                  aria-label="Select all review rows"
                  checked={allReviewRowsSelected}
                  onChange={toggleAllReviewSelection}
                  type="checkbox"
                />
              </span>
              <span>Merchant</span>
              <span>Category</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {reviewRows.map((transaction) => (
              <div className="transactions-table-row" role="row" key={transaction.id}>
                <input
                  aria-label={`Select ${transaction.merchant}`}
                  checked={selectedReviewIds.includes(transaction.id)}
                  onChange={() => toggleReviewSelection(transaction.id)}
                  type="checkbox"
                />
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
                  <button type="button" aria-label={`Apply ${transaction.merchant} to similar`} onClick={() => applyToSimilar(transaction.id)}>
                    <Wand2 size={15} />
                  </button>
                  <button type="button" aria-label={`Create rule from ${transaction.merchant}`} onClick={() => createRuleFromTransaction(transaction.id)}>
                    <GitBranch size={15} />
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
              <Tags size={17} />
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

type ReviewUndoAction = {
  merchant: string;
  transactions: Array<{
    id: string;
    previousStatus: TransactionRow["status"];
  }>;
  nextStatus: "reviewed" | "excluded";
};

function getReviewStatusLabel(status: ReviewUndoAction["nextStatus"]) {
  return status === "reviewed" ? "reviewed" : "excluded";
}

function normalizeMerchant(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isReviewSuccessMessage(message: string) {
  return (
    message.endsWith("saved.") ||
    message.endsWith("reviewed.") ||
    message.endsWith("excluded.") ||
    message.endsWith("undone.") ||
    message.endsWith("recategorized.") ||
    message.endsWith("persist rules.") ||
    message.startsWith("Rule preview created") ||
    message.startsWith("Rule created")
  );
}

async function persistReviewPatch(body: { id: string; categoryName?: string; reviewStatus?: "reviewed" | "excluded" | "needs_review" }) {
  const response = await fetch("/api/transactions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Review update failed");
  }
}

function ReviewMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

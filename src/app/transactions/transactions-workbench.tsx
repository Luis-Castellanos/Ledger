"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Plus, ReceiptText, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { defaultTransactionFilters, type DirectionFilter, type TransactionFilterState, type TransactionSortMode } from "@/lib/finance/transaction-filters";
import { sampleTransactionRows, type TransactionRow, type TransactionStatus } from "@/lib/finance/transaction-sample-data";
import { createManualTransactionSchema, parseTagList } from "@/lib/finance/transaction";
import { formatMoney, parseDollarAmount } from "@/lib/finance/money";
import { canUseLocalFallback, dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, productionFallbackMessage, type DataSourceState } from "@/lib/demo-fallback";

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
const directionFilters = [
  { label: "All directions", value: "all" },
  { label: "Inflows", value: "inflow" },
  { label: "Outflows", value: "outflow" },
] satisfies { label: string; value: DirectionFilter }[];
const sortOptions = [
  { label: "Newest first", value: "date_desc" },
  { label: "Oldest first", value: "date_asc" },
  { label: "Largest amount", value: "amount_desc" },
  { label: "Smallest amount", value: "amount_asc" },
  { label: "Merchant A-Z", value: "merchant_asc" },
  { label: "Category A-Z", value: "category_asc" },
] satisfies { label: string; value: TransactionSortMode }[];

export function TransactionsWorkbench({ initialFilters = defaultTransactionFilters }: { initialFilters?: TransactionFilterState }) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(() => demoFallback(sampleTransactionRows, []));
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>(() => demoFallback(sampleAccounts.map((account) => ({ id: account.name, name: account.name })), []));
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(() => demoFallback(fallbackCategoryOptions, []));
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState(initialFilters.query);
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>(initialFilters.status);
  const [accountFilter, setAccountFilter] = useState(initialFilters.account);
  const [categoryFilter, setCategoryFilter] = useState(initialFilters.category);
  const [tagFilter, setTagFilter] = useState(initialFilters.tag);
  const [transferFilter, setTransferFilter] = useState<"all" | NonNullable<TransactionRow["transferStatus"]>>(initialFilters.transfer);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>(initialFilters.direction);
  const [sortMode, setSortMode] = useState<TransactionSortMode>(initialFilters.sort);
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [lastDeletedTransaction, setLastDeletedTransaction] = useState<TransactionRow | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(() => demoFallback(sampleTransactionRows[0]?.id ?? null, null));
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("Groceries");
  const [bulkStatus, setBulkStatus] = useState<TransactionStatus>("reviewed");
  const [bulkTransferStatus, setBulkTransferStatus] = useState<NonNullable<TransactionRow["transferStatus"]>>("none");
  const [dataSource, setDataSource] = useState<DataSourceState>(() => fallbackDataSource());
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    merchant: "",
    accountId: demoFallback(sampleAccounts[0]?.name ?? "", ""),
    category: "Groceries",
    amount: "",
    tags: "",
  });
  const [editFormState, setEditFormState] = useState({
    amount: "",
    date: "",
    merchant: "",
    notes: "",
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
          setAccountOptions(nextAccounts.length > 0 ? nextAccounts : demoFallback(sampleAccounts.map((account) => ({ id: account.name, name: account.name })), []));
          setCategoryOptions(nextCategories.length > 0 ? nextCategories : demoFallback(fallbackCategoryOptions, []));
          setTransactions(transactionsPayload.transactions);
          setSelectedTransactionId(transactionsPayload.transactions[0]?.id ?? null);
          setBulkCategory(getDefaultCategoryName(nextCategories));
          setFormState((current) => ({
            ...current,
            accountId: nextAccounts[0]?.id ?? current.accountId,
            category: getDefaultCategoryName(nextCategories, current.category),
          }));
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setTransactions(demoFallback(sampleTransactionRows, []));
          setAccountOptions(demoFallback(sampleAccounts.map((account) => ({ id: account.name, name: account.name })), []));
          setCategoryOptions(demoFallback(fallbackCategoryOptions, []));
          setDataSource(fallbackDataSource());
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
      const matchesDirection =
        directionFilter === "all" ||
        (directionFilter === "inflow" && transaction.amountMinor > 0) ||
        (directionFilter === "outflow" && transaction.amountMinor < 0);
      const matchesTag = tagFilter === "all" || (transaction.tags ?? []).includes(tagFilter);
      const matchesQuery =
        !normalizedQuery ||
        [transaction.merchant, transaction.account, transaction.category, transaction.date, ...(transaction.tags ?? [])].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesStatus && matchesAccount && matchesCategory && matchesTransfer && matchesDirection && matchesTag && matchesQuery;
    });
  }, [accountFilter, categoryFilter, directionFilter, query, statusFilter, tagFilter, transactions, transferFilter]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((left, right) => compareTransactions(left, right, sortMode));
  }, [filteredTransactions, sortMode]);
  const groupedTransactions = useMemo(() => groupTransactionsByDate(sortedTransactions), [sortedTransactions]);

  const selectedVisibleTransactions = sortedTransactions.filter((transaction) => selectedTransactionIds.includes(transaction.id));
  const selectedVisibleCount = selectedVisibleTransactions.length;
  const allVisibleTransactionsSelected = sortedTransactions.length > 0 && selectedVisibleCount === sortedTransactions.length;

  const tagOptions = useMemo(() => {
    return Array.from(new Set(transactions.flatMap((transaction) => transaction.tags ?? []))).sort((left, right) => left.localeCompare(right));
  }, [transactions]);

  const selectedTransaction = useMemo(() => {
    return transactions.find((transaction) => transaction.id === selectedTransactionId) ?? transactions[0] ?? null;
  }, [selectedTransactionId, transactions]);

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
      await persistTransactionPatch({
        body: { id, reviewStatus: status },
        onFailure: () => setMutationMessage("Transaction status stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
    }
  }

  async function updateCategory(id: string, category: string) {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, category } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({
        body: { id, categoryName: category },
        onFailure: () => setMutationMessage("Category change stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
    }
  }

  async function updateTransferStatus(id: string, transferStatus: NonNullable<TransactionRow["transferStatus"]>) {
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, transferStatus } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({
        body: { id, transferStatus },
        onFailure: () => setMutationMessage("Transfer classification stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
    }
  }

  function toggleTransactionSelection(id: string) {
    setSelectedTransactionIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisibleTransactions() {
    setSelectedTransactionIds(allVisibleTransactionsSelected ? [] : sortedTransactions.map((transaction) => transaction.id));
  }

  async function updateSelectedTransactions(patch: Partial<Pick<TransactionRow, "category" | "status" | "transferStatus">>, successMessage: string) {
    if (selectedVisibleTransactions.length === 0) {
      return;
    }

    const selectedIds = selectedVisibleTransactions.map((transaction) => transaction.id);
    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (selectedIds.includes(transaction.id) ? { ...transaction, ...patch } : transaction)));

    if (dataSource === "database") {
      await Promise.all(
        selectedIds.map((id) =>
          persistTransactionPatch({
            body: {
              id,
              ...(patch.category ? { categoryName: patch.category } : {}),
              ...(patch.status ? { reviewStatus: patch.status } : {}),
              ...(patch.transferStatus ? { transferStatus: patch.transferStatus } : {}),
            },
            onFailure: () => setMutationMessage("Bulk transaction update stayed local because the API was unavailable."),
            onSuccess: () => setMutationMessage(null),
          }),
        ),
      );
    }

    setSelectedTransactionIds([]);
    setMutationMessage(successMessage);
  }

  async function updateTags(id: string, tagText: string) {
    const tags = parseTagList(tagText);

    hasLocalEdits.current = true;
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, tags } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({
        body: { id, tags },
        onFailure: () => setMutationMessage("Tag change stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
    }
  }

  async function deleteTransaction(id: string) {
    const transaction = transactions.find((row) => row.id === id);

    if (!transaction) {
      return;
    }

    hasLocalEdits.current = true;
    setLastDeletedTransaction(transaction);
    setSelectedTransactionId((current) => (current === id ? null : current));
    setSelectedTransactionIds((current) => current.filter((selectedId) => selectedId !== id));
    setTransactions((current) => current.filter((row) => row.id !== id));

    if (dataSource === "database") {
      await persistTransactionPatch({
        body: { id, action: "delete" },
        onFailure: () => setMutationMessage("Delete stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
    }
  }

  async function restoreLastDeletedTransaction() {
    if (!lastDeletedTransaction) {
      return;
    }

    hasLocalEdits.current = true;
    setTransactions((current) => [lastDeletedTransaction, ...current]);
    setSelectedTransactionId(lastDeletedTransaction.id);
    setLastDeletedTransaction(null);

    if (dataSource === "database") {
      await persistTransactionPatch({
        body: { id: lastDeletedTransaction.id, action: "restore" },
        onFailure: () => setMutationMessage("Restore stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
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
        tags: parseTagList(formState.tags),
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
            tags: "",
          });
          setError(null);
          return;
        }
      }

      if (!canUseLocalFallback(dataSource)) {
        setError(productionFallbackMessage("Transaction save"));
        return;
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
          tags: parsed.tags ?? [],
          transferStatus: "none",
        },
        ...current,
      ]);
      setDataSource(fallbackDataSource());
      setFormState({
        date: new Date().toISOString().slice(0, 10),
        merchant: "",
        accountId: accountOptions[0]?.id ?? "",
        category: getDefaultCategoryName(categoryOptions, formState.category),
        amount: "",
        tags: "",
      });
      setError(dataSource === "database" ? demoFallback("Saved in local demo mode because the transaction API rejected the write.", productionFallbackMessage("Transaction save")) : null);
    } catch {
      setError("Enter a valid signed dollar amount.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditingTransaction(transaction: TransactionRow) {
    setSelectedTransactionId(transaction.id);
    setEditFormState({
      amount: formatSignedAmount(transaction.amountMinor),
      date: transaction.date,
      merchant: transaction.merchant,
      notes: transaction.notes ?? "",
    });
  }

  async function saveSelectedTransaction() {
    const selected = selectedTransaction;

    if (!selected) {
      return;
    }

    const amountInput = editFormState.amount || formatSignedAmount(selected.amountMinor);
    const dateInput = editFormState.date || selected.date;
    const merchantInput = editFormState.merchant.trim() || selected.merchant;
    const notesInput = editFormState.notes.trim() || (selected.notes ?? "");
    let amountMinor: number;

    try {
      amountMinor = parseDollarAmount(amountInput);
    } catch {
      setError("Enter a valid signed dollar amount for the selected transaction.");
      return;
    }

    hasLocalEdits.current = true;
    const patch = {
      amountMinor,
      date: dateInput,
      merchant: merchantInput,
      notes: notesInput || undefined,
    };
    setTransactions((current) => current.map((transaction) => (transaction.id === selected.id ? { ...transaction, ...patch } : transaction)));

    if (dataSource === "database") {
      await persistTransactionPatch({
        body: {
          id: selected.id,
          amount: amountInput,
          date: dateInput,
          merchant: merchantInput,
          notes: notesInput,
        },
        onFailure: () => setMutationMessage("Transaction edit stayed local because the API was unavailable."),
        onSuccess: () => setMutationMessage(null),
      });
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
            <span className={dataSourceStatusClass(dataSource)}>{dataSourceLabel(dataSource)}</span>
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
              <select aria-label="Tag filter" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="all">All tags</option>
                {tagOptions.map((tag) => (
                  <option value={tag} key={tag}>
                    {tag}
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
              <select
                aria-label="Direction filter"
                value={directionFilter}
                onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)}
              >
                {directionFilters.map((direction) => (
                  <option value={direction.value} key={direction.value}>
                    {direction.label}
                  </option>
                ))}
              </select>
              <select aria-label="Sort transactions" value={sortMode} onChange={(event) => setSortMode(event.target.value as TransactionSortMode)}>
                {sortOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {mutationMessage ? <p className="form-error">{mutationMessage}</p> : null}
          <div className="transaction-undo-banner review-bulk-bar">
            <span>{selectedVisibleCount} selected</span>
            <select aria-label="Bulk transaction category" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}>
              {categoryOptions.map((category) => (
                <option value={category.name} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateSelectedTransactions({ category: bulkCategory }, `${selectedVisibleCount} selected transactions recategorized.`)}
              disabled={selectedVisibleCount === 0}
            >
              Set category
            </button>
            <select aria-label="Bulk transaction status" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as TransactionStatus)}>
              {statuses.map((status) => (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateSelectedTransactions({ status: bulkStatus }, `${selectedVisibleCount} selected transactions marked ${bulkStatus.replace("_", " ")}.`)}
              disabled={selectedVisibleCount === 0}
            >
              Set status
            </button>
            <select
              aria-label="Bulk transaction transfer status"
              value={bulkTransferStatus}
              onChange={(event) => setBulkTransferStatus(event.target.value as NonNullable<TransactionRow["transferStatus"]>)}
            >
              {transferStatuses.map((status) => (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                updateSelectedTransactions({ transferStatus: bulkTransferStatus }, `${selectedVisibleCount} selected transactions updated for movement type.`)
              }
              disabled={selectedVisibleCount === 0}
            >
              Set movement
            </button>
          </div>

          <div className="transactions-table transaction-register-table" role="table" aria-label="Transactions">
            <div className="transactions-table-head" role="row">
              <span>
                <input
                  aria-label="Select all visible transactions"
                  checked={allVisibleTransactionsSelected}
                  onChange={toggleAllVisibleTransactions}
                  type="checkbox"
                />
              </span>
              <span>Merchant</span>
              <span>Category</span>
              <span>Status / movement</span>
              <span>Account</span>
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
            {groupedTransactions.length ? (
              groupedTransactions.map((group) => (
                <div className="transaction-day-group" key={group.date}>
                  <div className="transaction-date-header">
                    <span>{formatLongDate(group.date)}</span>
                    <strong className={group.totalMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(group.totalMinor)}</strong>
                  </div>
                  {group.transactions.map((transaction) => {
                    const isSelected = selectedTransaction?.id === transaction.id;
                    return (
                      <div
                        className={`transactions-table-row transaction-register-row ${isSelected ? "transaction-register-row-active" : ""} ${transaction.status === "needs_review" ? "transaction-register-row-review" : ""}`}
                        key={transaction.id}
                        onClick={() => startEditingTransaction(transaction)}
                        role="row"
                      >
                        <input
                          aria-label={`Select ${transaction.merchant}`}
                          checked={selectedTransactionIds.includes(transaction.id)}
                          onChange={() => toggleTransactionSelection(transaction.id)}
                          onClick={(event) => event.stopPropagation()}
                          type="checkbox"
                        />
                        <div className="transaction-register-name">
                          <p>{transaction.merchant}</p>
                          <span>{transaction.date} / {(transaction.tags ?? []).join(", ") || "No tags"}</span>
                        </div>
                        <select
                          aria-label={`Category for ${transaction.merchant}`}
                          onClick={(event) => event.stopPropagation()}
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
                            onClick={(event) => event.stopPropagation()}
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
                            onClick={(event) => event.stopPropagation()}
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
                        <div className="transaction-register-account">
                          <span>{transaction.account}</span>
                          <input
                            aria-label={`Tags for ${transaction.merchant}`}
                            defaultValue={(transaction.tags ?? []).join(", ")}
                            onBlur={(event) => void updateTags(transaction.id, event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            placeholder="tags"
                          />
                        </div>
                        <div className="transaction-amount-actions">
                          <strong className={transaction.amountMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(transaction.amountMinor)}</strong>
                          <button type="button" aria-label={`Delete ${transaction.merchant}`} onClick={(event) => {
                            event.stopPropagation();
                            void deleteTransaction(transaction.id);
                          }}>
                            <Trash2 size={15} />
                          </button>
                          <button type="button" aria-label={`Edit ${transaction.merchant}`} onClick={(event) => {
                            event.stopPropagation();
                            startEditingTransaction(transaction);
                          }}>
                            <ReceiptText size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="transaction-empty-state">No transactions match the current filters.</div>
            )}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Selected row</p>
              <h2 className="panel-title">Edit transaction</h2>
            </div>
          </div>
          {selectedTransaction ? (
            <div className="account-form">
              <div className="transaction-selected-summary">
                <span>{selectedTransaction.account}</span>
                <strong className={selectedTransaction.amountMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(selectedTransaction.amountMinor)}</strong>
                <p>{selectedTransaction.category}</p>
              </div>
              <label>
                <span>Date</span>
                <input
                  aria-label="Edit transaction date"
                  type="date"
                  value={editFormState.date || selectedTransaction.date}
                  onChange={(event) => setEditFormState((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label>
                <span>Merchant</span>
                <input
                  aria-label="Edit transaction merchant"
                  value={editFormState.merchant || selectedTransaction.merchant}
                  onChange={(event) => setEditFormState((current) => ({ ...current, merchant: event.target.value }))}
                />
              </label>
              <label>
                <span>Amount</span>
                <input
                  aria-label="Edit transaction amount"
                  value={editFormState.amount || formatSignedAmount(selectedTransaction.amountMinor)}
                  onChange={(event) => setEditFormState((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>
              <label>
                <span>Notes</span>
                <input
                  aria-label="Edit transaction notes"
                  value={editFormState.notes}
                  onChange={(event) => setEditFormState((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional note"
                />
              </label>
              <button className="secondary-action" type="button" onClick={saveSelectedTransaction}>
                <Save size={16} />
                Save edit
              </button>
            </div>
          ) : (
            <p className="empty-copy">Select a transaction row to edit its core fields.</p>
          )}
        </section>

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
            <label>
              <span>Tags</span>
              <input
                value={formState.tags}
                onChange={(event) => setFormState((current) => ({ ...current, tags: event.target.value }))}
                placeholder="tax, reimbursable"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-action" type="submit">
              <Save size={16} />
              {isSaving ? "Saving" : "Save transaction"}
            </button>
          </form>
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

function formatSignedAmount(amountMinor: number) {
  return `${amountMinor < 0 ? "-" : ""}${(Math.abs(amountMinor) / 100).toFixed(2)}`;
}

function compareTransactions(left: TransactionRow, right: TransactionRow, sortMode: TransactionSortMode) {
  if (sortMode === "date_asc") {
    return left.date.localeCompare(right.date) || left.merchant.localeCompare(right.merchant);
  }

  if (sortMode === "amount_desc") {
    return right.amountMinor - left.amountMinor || right.date.localeCompare(left.date);
  }

  if (sortMode === "amount_asc") {
    return left.amountMinor - right.amountMinor || right.date.localeCompare(left.date);
  }

  if (sortMode === "merchant_asc") {
    return left.merchant.localeCompare(right.merchant) || right.date.localeCompare(left.date);
  }

  if (sortMode === "category_asc") {
    return left.category.localeCompare(right.category) || right.date.localeCompare(left.date);
  }

  return right.date.localeCompare(left.date) || left.merchant.localeCompare(right.merchant);
}

function groupTransactionsByDate(transactions: TransactionRow[]) {
  const groups = new Map<string, { date: string; totalMinor: number; transactions: TransactionRow[] }>();
  for (const transaction of transactions) {
    const group = groups.get(transaction.date) ?? { date: transaction.date, totalMinor: 0, transactions: [] };
    group.totalMinor += transaction.amountMinor;
    group.transactions.push(transaction);
    groups.set(transaction.date, group);
  }
  return Array.from(groups.values());
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

async function persistTransactionPatch({
  body,
  onFailure,
  onSuccess,
}: {
  body: {
    id: string;
    amount?: string;
    date?: string;
    merchant?: string;
    notes?: string;
    reviewStatus?: TransactionStatus;
    transferStatus?: NonNullable<TransactionRow["transferStatus"]>;
    categoryName?: string;
    tags?: string[];
    action?: "delete" | "restore";
  };
  onFailure: () => void;
  onSuccess: () => void;
}) {
  try {
    const response = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Transaction update failed");
    }

    onSuccess();
  } catch {
    onFailure();
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

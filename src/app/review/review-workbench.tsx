"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, RotateCcw, Search, Shuffle } from "lucide-react";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { formatMoney } from "@/lib/finance/money";
import { sampleTransactionRows } from "@/lib/finance/transaction-sample-data";
import { dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, type DataSourceState } from "@/lib/demo-fallback";

type Category = {
  id: string;
  name: string;
  slug?: string;
  color?: string | null;
};

type ReviewTransaction = {
  id: string;
  date: string;
  amount: number;
  amountMinor: number;
  merchant: string;
  rawDescription: string;
  isTransfer: boolean;
  transferStatus?: "none" | "transfer";
  tags: string[];
  notes?: string | null;
  account: {
    id: string;
    displayName: string;
    type: string;
  };
};

type SimilarTransaction = {
  id: string;
  date: string;
  amount: number;
  amountMinor?: number;
  merchant: string;
  rawDescription: string;
  needsReview: boolean;
  category: Category | null;
};

type SuggestedCategory = Category & {
  confidence?: number;
  basedOn: number;
};

type QueueResponse = {
  remaining: number;
  transaction: ReviewTransaction | null;
  similar: SimilarTransaction[];
  suggestedCategory: SuggestedCategory | null;
  merchantPrefix?: string;
};

type RecentlyReviewed = {
  id: string;
  merchant: string;
  categoryName: string | null;
  amountMinor: number;
  reviewedAt: string;
};

const fallbackCategoryOptions: Category[] = defaultCategoryTree
  .flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)])
  .map((name) => ({ id: name, name, slug: name.toLowerCase().replace(/\s+/g, "-"), color: null }));

export function ReviewWorkbench() {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>(() => demoFallback(fallbackCategoryOptions, []));
  const [skipIds, setSkipIds] = useState<string[]>([]);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [isEditingMerchant, setIsEditingMerchant] = useState(false);
  const [merchantDraft, setMerchantDraft] = useState("");
  const [recent, setRecent] = useState<RecentlyReviewed[]>([]);
  const [session, setSession] = useState({ reviewed: 0, skipped: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataSource, setDataSource] = useState<DataSourceState>("database");

  async function loadQueue(nextSkipIds = skipIds) {
    try {
      const skipParam = nextSkipIds.length ? `?skip=${encodeURIComponent(nextSkipIds.join(","))}` : "";
      const [queueResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/review/queue${skipParam}`, { headers: { Accept: "application/json" } }),
        fetch("/api/categories", { headers: { Accept: "application/json" } }),
      ]);

      if (!queueResponse.ok || !categoriesResponse.ok) {
        throw new Error("Review APIs unavailable");
      }

      const queuePayload = (await queueResponse.json()) as { data: QueueResponse };
      const categoriesPayload = (await categoriesResponse.json()) as { categories: Category[] };
      setQueue(queuePayload.data);
      setCategories(categoriesPayload.categories.length ? categoriesPayload.categories : fallbackCategoryOptions);
      setPendingCategoryId(queuePayload.data.suggestedCategory?.id ?? null);
      setMerchantDraft(queuePayload.data.transaction?.merchant ?? "");
      setDataSource("database");
    } catch {
      setQueue(demoFallback(buildDemoQueue(nextSkipIds), { remaining: 0, transaction: null, similar: [], suggestedCategory: null }));
      setCategories(demoFallback(fallbackCategoryOptions, []));
      setDataSource(fallbackDataSource());
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadQueue([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transaction = queue?.transaction ?? null;
  const suggested = queue?.suggestedCategory ?? null;
  const similar = queue?.similar ?? [];
  const remaining = queue?.remaining ?? 0;
  const quickCategories = useMemo(() => {
    const preferred = [suggested?.id, ...categories.map((category) => category.id)].filter(Boolean) as string[];
    const seen = new Set<string>();
    return preferred
      .map((id) => categories.find((category) => category.id === id) ?? (suggested?.id === id ? suggested : null))
      .filter((category): category is Category => {
        if (!category || seen.has(category.id)) {
          return false;
        }
        seen.add(category.id);
        return true;
      })
      .slice(0, 9);
  }, [categories, suggested]);
  const progress = session.reviewed + remaining === 0 ? 100 : Math.round((session.reviewed / Math.max(session.reviewed + remaining, 1)) * 100);

  async function refreshAfterAction(nextSkipIds = skipIds) {
    setPendingCategoryId(null);
    await loadQueue(nextSkipIds);
  }

  function skipCurrent() {
    if (!transaction) {
      return;
    }
    const nextSkipIds = [...skipIds, transaction.id];
    setSkipIds(nextSkipIds);
    setSession((current) => ({ ...current, skipped: current.skipped + 1 }));
    setMessage(`${transaction.merchant} skipped for this session.`);
    void refreshAfterAction(nextSkipIds);
  }

  async function commitMerchant() {
    if (!transaction || !merchantDraft.trim()) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ merchant: merchantDraft.trim() }),
      });

      if (!response.ok) {
        throw new Error("Merchant update failed");
      }

      setQueue((current) =>
        current && current.transaction
          ? { ...current, transaction: { ...current.transaction, merchant: merchantDraft.trim(), rawDescription: merchantDraft.trim() } }
          : current,
      );
      setIsEditingMerchant(false);
      setMessage("Merchant name saved.");
    } catch {
      setMessage(dataSource === "demo" ? "Merchant name updated in demo mode." : "Merchant update stayed local because the API was unavailable.");
      setQueue((current) =>
        current && current.transaction
          ? { ...current, transaction: { ...current.transaction, merchant: merchantDraft.trim(), rawDescription: merchantDraft.trim() } }
          : current,
      );
      setIsEditingMerchant(false);
    } finally {
      setBusy(false);
    }
  }

  async function commitCategory(categoryId: string, options: { applyToSimilar?: boolean } = {}) {
    if (!transaction) {
      return;
    }

    const category = categories.find((item) => item.id === categoryId) ?? suggested;
    if (!category) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ categoryName: category.name, applyToSimilar: Boolean(options.applyToSimilar), isTransfer: transaction.isTransfer }),
      });

      if (!response.ok) {
        throw new Error("Category update failed");
      }

      setRecent((current) => [
        { id: transaction.id, merchant: transaction.merchant, categoryName: category.name, amountMinor: transaction.amountMinor, reviewedAt: new Date().toISOString() },
        ...current.slice(0, 7),
      ]);
      setSession((current) => ({ ...current, reviewed: current.reviewed + 1 }));
      setMessage(`${transaction.merchant} reviewed as ${category.name}.`);
      await refreshAfterAction();
    } catch {
      if (dataSource === "demo") {
        setRecent((current) => [
          { id: transaction.id, merchant: transaction.merchant, categoryName: category.name, amountMinor: transaction.amountMinor, reviewedAt: new Date().toISOString() },
          ...current.slice(0, 7),
        ]);
        setSession((current) => ({ ...current, reviewed: current.reviewed + 1 }));
        setMessage(`${transaction.merchant} reviewed as ${category.name}.`);
        await refreshAfterAction([...skipIds, transaction.id]);
      } else {
        setMessage("Category update stayed local because the API was unavailable.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function markReviewed() {
    if (!transaction) {
      return;
    }
    const categoryId = pendingCategoryId ?? suggested?.id ?? null;
    if (categoryId) {
      await commitCategory(categoryId);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reviewStatus: "reviewed" }),
      });
      if (!response.ok) {
        throw new Error("Review update failed");
      }
      setRecent((current) => [
        { id: transaction.id, merchant: transaction.merchant, categoryName: null, amountMinor: transaction.amountMinor, reviewedAt: new Date().toISOString() },
        ...current.slice(0, 7),
      ]);
      setSession((current) => ({ ...current, reviewed: current.reviewed + 1 }));
      setMessage(`${transaction.merchant} marked reviewed.`);
      await refreshAfterAction();
    } catch {
      setMessage(dataSource === "demo" ? `${transaction.merchant} marked reviewed.` : "Review update stayed local because the API was unavailable.");
      await refreshAfterAction([...skipIds, transaction.id]);
    } finally {
      setBusy(false);
    }
  }

  async function excludeCurrent() {
    if (!transaction) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reviewStatus: "excluded" }),
      });
      if (!response.ok) {
        throw new Error("Exclude update failed");
      }
      setSession((current) => ({ ...current, reviewed: current.reviewed + 1 }));
      setMessage(`${transaction.merchant} excluded.`);
      await refreshAfterAction();
    } catch {
      setMessage(dataSource === "demo" ? `${transaction.merchant} excluded.` : "Exclude stayed local because the API was unavailable.");
      await refreshAfterAction([...skipIds, transaction.id]);
    } finally {
      setBusy(false);
    }
  }

  async function toggleTransfer() {
    if (!transaction) {
      return;
    }
    const nextTransfer = !transaction.isTransfer;
    setQueue((current) => (current?.transaction ? { ...current, transaction: { ...current.transaction, isTransfer: nextTransfer } } : current));

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ transferStatus: nextTransfer ? "transfer" : "none" }),
      });
      if (!response.ok) {
        throw new Error("Transfer update failed");
      }
      setMessage(nextTransfer ? "Marked as transfer." : "Removed transfer flag.");
    } catch {
      setMessage(dataSource === "demo" ? "Transfer flag updated in demo mode." : "Transfer flag stayed local because the API was unavailable.");
    }
  }

  async function undoRecent(id: string) {
    try {
      await fetch(`/api/transactions/${id}/unreview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ clearCategory: false }),
      });
    } catch {
      // Demo mode still restores the queue via the local skip reset below.
    }
    setRecent((current) => current.filter((item) => item.id !== id));
    setSkipIds((current) => current.filter((item) => item !== id));
    setSession((current) => ({ ...current, reviewed: Math.max(0, current.reviewed - 1) }));
    setMessage("Review decision undone.");
    await loadQueue(skipIds.filter((item) => item !== id));
  }

  if (!transaction) {
    return (
      <div className="p-5 lg:p-7">
        <section className="rounded-xl border border-border-subtle bg-surface-1 p-8 text-center">
          <CheckCircle2 className="mx-auto text-accent-300" size={28} />
          <h2 className="mt-3 text-[22px] font-semibold text-text-primary">Review queue clear</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-text-tertiary">There are no unresolved transactions in the current queue.</p>
          <button className="mt-5 rounded-lg border border-border-subtle px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2" onClick={() => void loadQueue([])} type="button">
            Reload queue
          </button>
        </section>
      </div>
    );
  }

  const selectedCategory = categories.find((category) => category.id === pendingCategoryId) ?? null;
  const amountNegative = transaction.amountMinor < 0;

  return (
    <div className="p-5 lg:p-7">
      <div className="mb-5">
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent-500 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex flex-col gap-2 text-[13px] text-text-tertiary md:flex-row md:items-center md:justify-between">
          <div>
            <strong className="tabular-nums text-text-primary">{remaining}</strong> remaining
            <span className="mx-2 text-text-muted">·</span>
            <strong className="tabular-nums text-text-primary">{session.reviewed}</strong> done
            <span className="mx-2 text-text-muted">·</span>
            <strong className="tabular-nums text-text-primary">{session.skipped}</strong> skipped
          </div>
          <span className={dataSourceStatusClass(dataSource)}>{dataSourceLabel(dataSource)}</span>
        </div>
      </div>

      {message ? <div className="mb-5 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 text-[13px] text-text-secondary">{message}</div> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5 lg:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[18px] font-semibold text-accent-300">
                {(transaction.merchant || transaction.rawDescription).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {isEditingMerchant ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-[15px] font-semibold text-text-primary outline-none"
                      onChange={(event) => setMerchantDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void commitMerchant();
                        }
                        if (event.key === "Escape") {
                          setIsEditingMerchant(false);
                        }
                      }}
                      value={merchantDraft}
                    />
                    <button className="rounded-lg bg-accent-500 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void commitMerchant()} type="button">
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[22px] font-semibold tracking-normal text-text-primary">{transaction.merchant}</h2>
                    <button className="rounded-md border border-border-subtle p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary" onClick={() => setIsEditingMerchant(true)} type="button" aria-label="Edit merchant">
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
                <p className="mt-1 text-[13px] text-text-tertiary">
                  {formatDate(transaction.date)} · {transaction.account.displayName}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className={`text-[26px] font-semibold tabular-nums ${amountNegative ? "text-negative" : "text-positive"}`}>
                {formatMoney(transaction.amountMinor)}
              </div>
              <div className="mt-1 text-[12px] text-text-muted">{transaction.account.type}</div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border-subtle bg-surface-base px-4 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Original statement</p>
            <p className="mt-2 break-words font-mono text-[13px] text-text-secondary">{transaction.rawDescription}</p>
          </div>

          <div className="mt-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Category</p>
            {suggested ? (
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-accent-500/30 bg-accent-soft px-4 py-3 md:flex-row md:items-center">
                <div className="flex-1 text-[13px] text-accent-300">
                  Suggested: <strong className="text-accent-200">{iconFor(suggested.name)} {suggested.name}</strong>
                  <span className="text-text-tertiary"> based on {suggested.basedOn} similar transaction{suggested.basedOn === 1 ? "" : "s"}.</span>
                </div>
                <button className="rounded-lg bg-accent-500 px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void commitCategory(suggested.id)} type="button">
                  Apply
                </button>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {quickCategories.map((category) => {
                const selected = pendingCategoryId === category.id;
                return (
                  <button
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] transition-colors ${
                      selected ? "border-accent-500 bg-accent-soft text-accent-300" : "border-border-subtle bg-surface-base text-text-secondary hover:border-border-strong"
                    }`}
                    key={category.id}
                    onClick={() => setPendingCategoryId(category.id)}
                    type="button"
                  >
                    <span>{iconFor(category.name)}</span>
                    <span>{category.name}</span>
                  </button>
                );
              })}
              <CategorySearch categories={categories} onPick={setPendingCategoryId} pendingCategoryId={pendingCategoryId} />
            </div>
            {selectedCategory ? <p className="mt-3 text-[12px] text-text-tertiary">Pending category: <span className="text-text-primary">{selectedCategory.name}</span></p> : null}
          </div>

          <button
            className="mt-5 flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-base px-4 py-3 text-left transition-colors hover:bg-surface-2"
            onClick={() => void toggleTransfer()}
            type="button"
          >
            <Shuffle size={18} />
            <span className="flex-1">
              <span className="block text-[14px] font-medium text-text-primary">Mark as transfer</span>
              <span className="mt-1 block text-[12px] text-text-tertiary">Excludes from spending and income totals.</span>
            </span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${transaction.isTransfer ? "bg-accent-500" : "bg-surface-3"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-[left] ${transaction.isTransfer ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>

          <div className="mt-6 flex flex-col gap-3 border-t border-border-subtle pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-[12px] text-text-muted">{selectedCategory ? `${selectedCategory.name} is ready to apply.` : "Choose a category or mark the transaction reviewed as-is."}</p>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-border-subtle px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2" onClick={skipCurrent} type="button">
                Skip
              </button>
              <button className="rounded-lg border border-border-subtle px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-50" disabled={busy} onClick={() => void excludeCurrent()} type="button">
                Exclude
              </button>
              <button className="rounded-lg bg-accent-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" disabled={busy} onClick={() => void markReviewed()} type="button">
                Mark reviewed
              </button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Similar transactions</p>
              <span className="text-[12px] text-text-muted">{similar.length}</span>
            </div>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {similar.length ? (
                similar.map((item) => (
                  <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-surface-base px-3 py-2 text-[13px]" key={item.id}>
                    <div className="min-w-0">
                      <p className="truncate text-text-secondary">{item.merchant}</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">{formatDate(item.date)} · {item.category?.name ?? "Uncategorized"}</p>
                    </div>
                    <strong className={(item.amountMinor ?? Math.round(item.amount * 100)) < 0 ? "text-negative" : "text-positive"}>
                      {formatMoney(item.amountMinor ?? Math.round(item.amount * 100))}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-[13px] text-text-muted">No similar transactions found.</p>
              )}
            </div>
            {suggested && similar.some((item) => item.needsReview) ? (
              <button className="mt-3 w-full rounded-lg border border-accent-500/30 bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent-300 disabled:opacity-50" disabled={busy} onClick={() => void commitCategory(suggested.id, { applyToSimilar: true })} type="button">
                Apply {suggested.name} to unresolved similars
              </button>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Recently reviewed</p>
              <span className="text-[12px] text-text-muted">Undo</span>
            </div>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {recent.length ? (
                recent.map((item) => (
                  <button className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-surface-base px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-2" key={`${item.id}-${item.reviewedAt}`} onClick={() => void undoRecent(item.id)} type="button">
                    <div className="min-w-0">
                      <p className="truncate text-text-secondary">{item.merchant}</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">{item.categoryName ?? "Reviewed"}</p>
                    </div>
                    <RotateCcw className="text-text-muted" size={15} />
                  </button>
                ))
              ) : (
                <p className="py-5 text-center text-[13px] text-text-muted">Nothing reviewed this session.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CategorySearch({ categories, pendingCategoryId, onPick }: { categories: Category[]; pendingCategoryId: string | null; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = categories.filter((category) => category.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30);

  return (
    <div className="relative">
      <button className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-base px-3.5 py-2 text-[14px] text-text-secondary transition-colors hover:border-border-strong" onClick={() => setOpen((current) => !current)} type="button">
        <Search size={14} />
        Search
      </button>
      {open ? (
        <>
          <button aria-label="Close category search" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} type="button" />
          <div className="absolute left-0 top-full z-40 mt-2 w-[360px] max-w-[calc(100vw-3rem)] rounded-xl border border-border-strong bg-surface-1 p-2 shadow-2xl">
            <input
              autoFocus
              className="mb-2 w-full rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-[13px] text-text-primary outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories"
              value={query}
            />
            <div className="max-h-72 overflow-y-auto">
              {matches.map((category) => (
                <button
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-2 ${
                    pendingCategoryId === category.id ? "text-accent-300" : "text-text-secondary"
                  }`}
                  key={category.id}
                  onClick={() => {
                    onPick(category.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  type="button"
                >
                  <span>{iconFor(category.name)}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function buildDemoQueue(skipIds: string[]): QueueResponse {
  const rows = sampleTransactionRows.filter((row) => row.status === "needs_review" && !skipIds.includes(row.id));
  const row = rows[0] ?? null;

  if (!row) {
    return { remaining: 0, transaction: null, similar: [], suggestedCategory: null };
  }

  const similar = sampleTransactionRows
    .filter((candidate) => candidate.id !== row.id && candidate.merchant.split(" ")[0] === row.merchant.split(" ")[0])
    .map((candidate) => ({
      id: candidate.id,
      date: candidate.date,
      amount: candidate.amountMinor / 100,
      amountMinor: candidate.amountMinor,
      merchant: candidate.merchant,
      rawDescription: candidate.merchant,
      needsReview: candidate.status === "needs_review",
      category: { id: candidate.category, name: candidate.category },
    }));

  return {
    remaining: rows.length,
    transaction: {
      id: row.id,
      date: row.date,
      amount: row.amountMinor / 100,
      amountMinor: row.amountMinor,
      merchant: row.merchant,
      rawDescription: row.merchant,
      isTransfer: row.transferStatus === "transfer",
      transferStatus: row.transferStatus ?? "none",
      tags: row.tags ?? [],
      notes: null,
      account: { id: row.account, displayName: row.account, type: "manual" },
    },
    similar,
    suggestedCategory: fallbackCategoryOptions.find((category) => category.name === row.category)
      ? { ...fallbackCategoryOptions.find((category) => category.name === row.category)!, basedOn: Math.max(similar.length, 1) }
      : null,
    merchantPrefix: row.merchant.split(" ").slice(0, 2).join(" "),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function iconFor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("grocery") || lower.includes("shopping")) return "$";
  if (lower.includes("payroll") || lower.includes("income")) return "+";
  if (lower.includes("transfer")) return "T";
  if (lower.includes("subscription")) return "R";
  if (lower.includes("interest")) return "%";
  return ".";
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCheck, Download, ReceiptText, Search, Undo2, X } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryPicker } from "@/components/category-picker";
import { ExportButton } from "@/components/export-button";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AuthControls } from "@/components/auth-controls";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useCategories } from "@/lib/api/queries/categories";
import { useBulkUpdateTransactions, useTransactionsInfinite, useUpdateTransaction } from "@/lib/api/queries/transactions";
import type { ApiCategory, ApiTransaction, TransactionFilters } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { defaultRegisterFilters, registerFiltersToSearch, type RegisterFilters } from "./filters";
import { TransactionSheet } from "./transaction-sheet";

const PAGE_SIZE = 50;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

export function TransactionsWorkbench({ initialFilters }: { initialFilters: RegisterFilters }) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<RegisterFilters>(initialFilters);
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(-1);
  const [activeTransaction, setActiveTransaction] = useState<ApiTransaction | null>(null);

  const accounts = useAccounts();
  const categories = useCategories();
  const update = useUpdateTransaction();
  const bulk = useBulkUpdateTransactions();

  // keep the URL shareable; replace (not push) so filter tweaks don't spam history
  useEffect(() => {
    router.replace(`${pathname}${registerFiltersToSearch(filters)}`, { scroll: false });
  }, [filters, pathname, router]);

  const accountId = filters.account ? accounts.data?.find((account) => account.name === filters.account)?.id : undefined;
  const wantsUncategorized = filters.category === "Uncategorized";
  const categoryId =
    filters.category && !wantsUncategorized
      ? categories.data?.find((category) => category.name === filters.category)?.id
      : undefined;

  const resolutionPending =
    (Boolean(filters.account) && accounts.isPending) || (Boolean(filters.category) && categories.isPending);
  const unknownAccount = Boolean(filters.account) && !accounts.isPending && !accountId;
  const unknownCategory = Boolean(filters.category) && !wantsUncategorized && !categories.isPending && !categoryId;

  const serverFilters = useMemo<TransactionFilters>(
    () => ({
      ...(debouncedQ ? { q: debouncedQ } : {}),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(wantsUncategorized ? { uncategorized: true } : {}),
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.transfer !== "all" ? { transfer: filters.transfer } : {}),
      ...(filters.direction !== "all" ? { direction: filters.direction } : {}),
      ...(filters.tag ? { tag: filters.tag } : {}),
      sort: filters.sort,
      limit: PAGE_SIZE,
    }),
    [debouncedQ, accountId, categoryId, wantsUncategorized, filters.status, filters.transfer, filters.direction, filters.tag, filters.sort],
  );

  const query = useTransactionsInfinite(serverFilters);
  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.transactions) ?? [], [query.data]);
  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  // keyboard: j/k move, x select, e edit, escape clears
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        activeTransaction ||
        target.closest("input, textarea, select, [contenteditable], [role=dialog], [role=combobox]")
      ) {
        return;
      }
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        setFocusIndex((current) => {
          const next = event.key === "j" ? Math.min(current + 1, rows.length - 1) : Math.max(current - 1, 0);
          document.querySelector<HTMLElement>(`[data-register-row="${next}"]`)?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (event.key === "x" && focusIndex >= 0 && rows[focusIndex]) {
        event.preventDefault();
        toggleSelected(rows[focusIndex].id);
      } else if (event.key === "e" && focusIndex >= 0 && rows[focusIndex]) {
        event.preventDefault();
        setActiveTransaction(rows[focusIndex]);
      } else if (event.key === "Escape") {
        setSelected(new Set());
        setFocusIndex(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rows, focusIndex, activeTransaction]);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function runBulk(input: Record<string, unknown>, label: string) {
    bulk.mutate(
      { ids: [...selected], ...input },
      {
        onSuccess: (result) => {
          toast.success(`${result.updated} transaction${result.updated === 1 ? "" : "s"} ${label}`);
          setSelected(new Set());
        },
        onError: (error) => toast.error(error.message || "Bulk update failed"),
      },
    );
  }

  function setCategoryInline(transaction: ApiTransaction, nextCategoryId: string | null) {
    update.mutate(
      { id: transaction.id, categoryId: nextCategoryId },
      { onError: (error) => toast.error(error.message || "Could not recategorize") },
    );
  }

  const unauthorized = [accounts.error, categories.error, query.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Ledger activity"
        title="Transactions"
        description={totalCount ? `${totalCount.toLocaleString()} entries on file` : undefined}
        actions={
          <>
            <ExportButton
              aria-label="Export transactions"
              format="transactions_csv"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Download size={14} /> Export
            </ExportButton>
            <AddTransactionDialog accounts={accounts.data ?? []} categories={categories.data ?? []} />
          </>
        }
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to see the register</p>
          <AuthControls />
        </div>
      ) : (
        <>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            accountNames={(accounts.data ?? []).map((account) => account.name)}
            categoryNames={["Uncategorized", ...(categories.data ?? []).filter((c) => !c.isArchived).map((category) => category.name)]}
          />

          {resolutionPending || query.isPending ? (
            <PageSkeleton rows={10} />
          ) : unknownAccount || unknownCategory ? (
            <EmptyState
              title={`No ${unknownAccount ? "account" : "category"} named “${unknownAccount ? filters.account : filters.category}”`}
              description="The link that brought you here references something that no longer exists."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(defaultRegisterFilters)}>
                  Clear filters
                </Button>
              }
            />
          ) : query.isError ? (
            <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Nothing matches"
              description={
                totalCount === 0 && !hasActiveFilters(filters)
                  ? "The register is empty. Record a transaction or import a statement to begin."
                  : "Loosen the filters to see more of the register."
              }
              action={
                hasActiveFilters(filters) ? (
                  <Button variant="outline" size="sm" onClick={() => setFilters(defaultRegisterFilters)}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Register
              rows={rows}
              sort={filters.sort}
              categories={categories.data ?? []}
              selected={selected}
              focusIndex={focusIndex}
              onToggle={toggleSelected}
              onToggleAll={(checked) => setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set())}
              onOpen={setActiveTransaction}
              onCategorize={setCategoryInline}
            />
          )}

          {query.hasNextPage ? (
            <div className="flex justify-center pt-1">
              <Button variant="outline" size="sm" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? "Loading…" : `Load more (${rows.length.toLocaleString()} of ${totalCount.toLocaleString()})`}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-popover px-4 py-2 shadow-lg md:bottom-6">
          <span className="font-money text-xs text-muted-foreground">{selected.size} selected</span>
          <CategoryPicker
            categories={categories.data ?? []}
            value={null}
            onSelect={(nextCategoryId) => runBulk({ categoryId: nextCategoryId }, "recategorized")}
            allowClear
            trigger={
              <Button size="sm" variant="outline" className="rounded-full">
                Set category
              </Button>
            }
          />
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => runBulk({ reviewStatus: "reviewed" }, "marked reviewed")}>
            <CheckCheck /> Reviewed
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => runBulk({ transferStatus: "transfer" }, "marked as transfers")}>
            <Undo2 /> Transfer
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
            <X />
          </Button>
        </div>
      ) : null}

      <TransactionSheet transaction={activeTransaction} categories={categories.data ?? []} onClose={() => setActiveTransaction(null)} />
    </div>
  );
}

function hasActiveFilters(filters: RegisterFilters) {
  return registerFiltersToSearch(filters) !== "";
}

function FilterBar({
  filters,
  onChange,
  accountNames,
  categoryNames,
}: {
  filters: RegisterFilters;
  onChange: React.Dispatch<React.SetStateAction<RegisterFilters>>;
  accountNames: string[];
  categoryNames: string[];
}) {
  const set = <K extends keyof RegisterFilters>(key: K, value: RegisterFilters[K]) =>
    onChange((current) => ({ ...current, [key]: value }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-44 flex-1 sm:max-w-xs">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search transactions"
          placeholder="Search the register…"
          value={filters.q}
          onChange={(event) => set("q", event.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <NamedSelect ariaLabel="Account filter" placeholder="Account" value={filters.account} onValueChange={(value) => set("account", value)} options={accountNames} />
      <NamedSelect ariaLabel="Category filter" placeholder="Category" value={filters.category} onValueChange={(value) => set("category", value)} options={categoryNames} />
      <EnumSelect
        ariaLabel="Status filter"
        value={filters.status}
        onValueChange={(value) => set("status", value as RegisterFilters["status"])}
        options={[
          ["all", "Any status"],
          ["needs_review", "Needs review"],
          ["reviewed", "Reviewed"],
          ["excluded", "Excluded"],
        ]}
      />
      <EnumSelect
        ariaLabel="Direction filter"
        value={filters.direction}
        onValueChange={(value) => set("direction", value as RegisterFilters["direction"])}
        options={[
          ["all", "In & out"],
          ["inflow", "Inflows"],
          ["outflow", "Outflows"],
        ]}
      />
      <EnumSelect
        ariaLabel="Transfer filter"
        value={filters.transfer}
        onValueChange={(value) => set("transfer", value as RegisterFilters["transfer"])}
        options={[
          ["all", "Transfers & spend"],
          ["transfer", "Transfers only"],
          ["none", "No transfers"],
        ]}
      />
      <EnumSelect
        ariaLabel="Sort transactions"
        value={filters.sort}
        onValueChange={(value) => set("sort", value as RegisterFilters["sort"])}
        options={[
          ["date_desc", "Newest first"],
          ["date_asc", "Oldest first"],
          ["amount_desc", "Largest in"],
          ["amount_asc", "Largest out"],
          ["merchant_asc", "Merchant A–Z"],
          ["merchant_desc", "Merchant Z–A"],
        ]}
      />
      {hasActiveFilters(filters) ? (
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => onChange(defaultRegisterFilters)}>
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}

function NamedSelect({
  ariaLabel,
  placeholder,
  value,
  onValueChange,
  options,
}: {
  ariaLabel: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Select value={value || "__all"} onValueChange={(next) => onValueChange(next === "__all" ? "" : next)}>
      <SelectTrigger size="sm" aria-label={ariaLabel} className="w-fit min-w-28 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">{placeholder}: all</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EnumSelect({
  ariaLabel,
  value,
  onValueChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" aria-label={ariaLabel} className="w-fit min-w-28 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, label]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Register({
  rows,
  sort,
  categories,
  selected,
  focusIndex,
  onToggle,
  onToggleAll,
  onOpen,
  onCategorize,
}: {
  rows: ApiTransaction[];
  sort: RegisterFilters["sort"];
  categories: ApiCategory[];
  selected: ReadonlySet<string>;
  focusIndex: number;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (transaction: ApiTransaction) => void;
  onCategorize: (transaction: ApiTransaction, categoryId: string | null) => void;
}) {
  const groupByDate = sort === "date_desc" || sort === "date_asc";
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* desktop header */}
      <div className="hidden items-center gap-3 border-b border-border px-4 py-2 md:flex">
        <Checkbox
          checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
          aria-label="Select all"
        />
        <span className="label-caps w-20">Date</span>
        <span className="label-caps flex-1">Merchant</span>
        <span className="label-caps w-40">Category</span>
        <span className="label-caps w-36">Account</span>
        <span className="label-caps w-28 text-right">Amount</span>
      </div>

      <ul>
        {rows.map((row, index) => {
          const previous = rows[index - 1];
          const showDateHeader = groupByDate && (!previous || previous.date !== row.date);
          return (
            <li key={row.id}>
              {showDateHeader ? (
                <p className="label-caps border-b border-border/60 bg-muted/40 px-4 py-1.5 md:hidden">
                  {format(new Date(`${row.date}T00:00:00`), "EEEE, MMM d")}
                </p>
              ) : null}
              <div
                data-register-row={index}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-accent/50",
                  focusIndex === index && "bg-accent/60",
                  selected.has(row.id) && "bg-primary/5",
                )}
                onClick={() => onOpen(row)}
              >
                <span onClick={(event) => event.stopPropagation()} className="flex items-center">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => onToggle(row.id)}
                    aria-label={`Select ${row.merchant}`}
                  />
                </span>
                <CategoryIcon
                  icon={categoryById.get(row.categoryId ?? "")?.icon}
                  name={row.category}
                  color={categoryById.get(row.categoryId ?? "")?.color}
                  size="md"
                />
                <span className="hidden w-20 shrink-0 font-money text-xs text-muted-foreground md:block">
                  {format(new Date(`${row.date}T00:00:00`), "MMM d")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{row.merchant}</span>
                    {row.status === "needs_review" ? (
                      <span aria-label="Needs review" title="Needs review" className="size-1.5 shrink-0 rounded-full bg-warning" />
                    ) : null}
                    {row.transferStatus === "transfer" ? (
                      <Badge variant="outline" className="h-4 border-transfer/40 px-1 text-[10px] text-transfer">
                        transfer
                      </Badge>
                    ) : null}
                    {row.status === "excluded" ? (
                      <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
                        excluded
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground md:hidden">
                    {format(new Date(`${row.date}T00:00:00`), "MMM d")} · {row.category} · {row.account}
                  </span>
                </span>
                <span className="hidden w-40 shrink-0 md:block" onClick={(event) => event.stopPropagation()}>
                  <CategoryPicker
                    categories={categories}
                    value={row.categoryId}
                    onSelect={(categoryId) => onCategorize(row, categoryId)}
                    allowClear
                    trigger={
                      <button
                        type="button"
                        className={cn(
                          "max-w-full truncate rounded-md px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-accent",
                          row.categoryId ? "text-foreground" : "italic text-muted-foreground",
                        )}
                      >
                        {row.category}
                      </button>
                    }
                  />
                </span>
                <span className="hidden w-36 shrink-0 truncate text-xs text-muted-foreground md:block">{row.account}</span>
                <span className="w-28 shrink-0 text-right">
                  <Money amountMinor={row.amountMinor} colorBySign={row.amountMinor > 0} className="text-sm" />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

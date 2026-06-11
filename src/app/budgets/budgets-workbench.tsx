"use client";

import { useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, PiggyBank, Plus, Trash2 } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { CategoryPicker } from "@/components/category-picker";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ApiError } from "@/lib/api/client";
import { useCategories } from "@/lib/api/queries/categories";
import { useBudgets, useCopyBudgets, useDeleteBudget, useUpsertBudget, type BudgetRow } from "@/lib/api/queries/budgets";
import { cn } from "@/lib/utils";

function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function BudgetsWorkbench() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const budgets = useBudgets(month);
  const categories = useCategories();
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();
  const copy = useCopyBudgets();

  const monthDate = new Date(`${month}-01T00:00:00`);
  const unauthorized = budgets.error instanceof ApiError && budgets.error.status === 401;

  function setBudget(categoryId: string, amount: string) {
    upsert.mutate(
      { categoryId, month, amount },
      { onError: (error) => toast.error(error.message || "Could not save the budget") },
    );
  }

  function copyLastMonth() {
    const fromMonth = monthKey(subMonths(monthDate, 1));
    copy.mutate(
      { fromMonth, toMonth: month },
      {
        onSuccess: (result) =>
          result.copied > 0
            ? toast.success(`${result.copied} budget${result.copied === 1 ? "" : "s"} copied from ${format(subMonths(monthDate, 1), "MMMM")}`)
            : toast(`Nothing new to copy from ${format(subMonths(monthDate, 1), "MMMM")}`),
        onError: (error) => toast.error(error.message || "Copy failed"),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Plan"
        title="Budgets"
        description="Monthly spending intentions, tracked against the ledger."
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" aria-label="Previous month" onClick={() => setMonth(monthKey(subMonths(monthDate, 1)))}>
              <ChevronLeft />
            </Button>
            <span className="min-w-28 text-center font-display text-sm font-semibold">{format(monthDate, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Next month" onClick={() => setMonth(monthKey(addMonths(monthDate, 1)))}>
              <ChevronRight />
            </Button>
          </div>
        }
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to plan your months</p>
          <AuthControls />
        </div>
      ) : budgets.isPending ? (
        <PageSkeleton rows={6} />
      ) : budgets.isError ? (
        <ErrorState message={budgets.error.message} onRetry={() => void budgets.refetch()} />
      ) : (
        <>
          {budgets.data.rows.length > 0 ? (
            <Card>
              <CardContent className="flex flex-wrap items-baseline justify-between gap-2 pt-0">
                <p className="text-sm text-muted-foreground">
                  <Money amountMinor={-budgets.data.totals.spentMinor} className="font-medium text-foreground" /> spent of{" "}
                  <Money amountMinor={budgets.data.totals.budgetedMinor} className="font-medium text-foreground" /> budgeted
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    budgets.data.totals.budgetedMinor - budgets.data.totals.spentMinor >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  <Money amountMinor={budgets.data.totals.budgetedMinor - budgets.data.totals.spentMinor} /> left
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <AddBudgetControl
              categories={categories.data ?? []}
              excludeCategoryIds={new Set(budgets.data.rows.map((row) => row.categoryId))}
              onAdd={setBudget}
              busy={upsert.isPending}
            />
            <Button variant="outline" size="sm" onClick={copyLastMonth} disabled={copy.isPending}>
              <Copy /> Copy {format(subMonths(monthDate, 1), "MMMM")}
            </Button>
          </div>

          {budgets.data.rows.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title={`No budgets for ${format(monthDate, "MMMM")}`}
              description="Set an amount per category, or pull last month's plan forward."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ul>
                {budgets.data.rows.map((row) => (
                  <BudgetRowItem
                    key={row.id}
                    row={row}
                    onSave={(amount) => setBudget(row.categoryId, amount)}
                    onDelete={() =>
                      remove.mutate(row.id, {
                        onSuccess: () => toast.success(`${row.category} budget removed`),
                        onError: (error) => toast.error(error.message || "Could not remove the budget"),
                      })
                    }
                  />
                ))}
              </ul>
            </div>
          )}

          {budgets.data.unbudgeted.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-dashed border-border">
              <p className="label-caps border-b border-border/60 px-4 py-2">Spending without a budget</p>
              <ul>
                {budgets.data.unbudgeted.slice(0, 8).map((entry) => (
                  <li key={entry.categoryId} className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2 text-sm last:border-b-0">
                    <span className="truncate text-muted-foreground">{entry.category}</span>
                    <span className="flex items-center gap-2">
                      <Money amountMinor={-entry.spentMinor} className="text-xs text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setBudget(entry.categoryId, (entry.spentMinor / 100).toFixed(2))}
                      >
                        <Plus /> Budget this
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function BudgetRowItem({ row, onSave, onDelete }: { row: BudgetRow; onSave: (amount: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState((row.amountMinor / 100).toFixed(2));
  const over = row.remainingMinor < 0;
  const percent = row.amountMinor > 0 ? Math.min(100, Math.round((row.spentMinor / row.amountMinor) * 100)) : 0;

  return (
    <li className="border-b border-border/60 px-4 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {row.color ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: row.color }} /> : null}
          <span className="truncate">{row.category}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm">
          {editing ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(amount);
                setEditing(false);
              }}
            >
              <Input
                autoFocus
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="h-7 w-24 text-right font-money text-xs"
                aria-label={`Budget for ${row.category}`}
              />
              <Button type="submit" size="sm" className="h-7 px-2 text-xs">
                Set
              </Button>
            </form>
          ) : (
            <>
              <button type="button" className="font-money hover:underline" onClick={() => setEditing(true)} aria-label={`Edit ${row.category} budget`}>
                <Money amountMinor={row.amountMinor} />
              </button>
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" aria-label={`Remove ${row.category} budget`} onClick={onDelete}>
                <Trash2 className="size-3" />
              </Button>
            </>
          )}
        </span>
      </div>
      <Progress
        value={percent}
        className={cn("h-1.5", over && "[&>[data-slot=progress-indicator]]:bg-negative")}
        aria-label={`${row.category} ${percent}% used`}
      />
      <p className={cn("mt-1 text-xs", over ? "text-negative" : "text-muted-foreground")}>
        <Money amountMinor={-row.spentMinor} /> spent ·{" "}
        {over ? (
          <>
            <Money amountMinor={-row.remainingMinor} /> over
          </>
        ) : (
          <>
            <Money amountMinor={row.remainingMinor} /> left
          </>
        )}
      </p>
    </li>
  );
}

function AddBudgetControl({
  categories,
  excludeCategoryIds,
  onAdd,
  busy,
}: {
  categories: Parameters<typeof CategoryPicker>[0]["categories"];
  excludeCategoryIds: Set<string>;
  onAdd: (categoryId: string, amount: string) => void;
  busy: boolean;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const available = categories.filter((category) => !excludeCategoryIds.has(category.id) && category.flowType === "expense");
  const selectedName = categories.find((category) => category.id === categoryId)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <Plus /> Add budget
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <p className="label-caps">New budget</p>
        <CategoryPicker categories={available} value={categoryId} onSelect={setCategoryId} className="w-full" placeholder="Pick a category" />
        <Input
          placeholder="450.00"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="font-money"
          aria-label="Budget amount"
        />
        <Button
          size="sm"
          className="w-full"
          disabled={!categoryId || !amount.trim() || busy}
          onClick={() => {
            if (categoryId) {
              onAdd(categoryId, amount.trim());
              toast.success(`${selectedName} budgeted`);
              setCategoryId(null);
              setAmount("");
              setOpen(false);
            }
          }}
        >
          Save budget
        </Button>
      </PopoverContent>
    </Popover>
  );
}

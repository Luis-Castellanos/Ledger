"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeftRight, Check, ClipboardCheck, SkipForward, Undo2, Wand2 } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryPicker } from "@/components/category-picker";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { useCategories } from "@/lib/api/queries/categories";
import {
  useCategorizeTransaction,
  useCreateMerchantRule,
  useReviewQueue,
  useUnreviewTransaction,
} from "@/lib/api/queries/review";
import { cn } from "@/lib/utils";

type UndoEntry = {
  id: string;
  merchant: string;
  /* the review action assigned this category (so undo clears it) */
  assignedCategory: boolean;
};

export function ReviewWorkbench() {
  const [skipIds, setSkipIds] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const queue = useReviewQueue(skipIds);
  const categories = useCategories();
  const categorize = useCategorizeTransaction();
  const unreview = useUnreviewTransaction();

  const transaction = queue.data?.transaction ?? null;
  const suggestion = queue.data?.suggestedCategory ?? null;
  const similar = queue.data?.similar ?? [];
  const similarPending = similar.filter((row) => row.needsReview).length;
  const remaining = queue.data?.remaining ?? 0;

  function review(categoryId: string | null, withSimilar: boolean) {
    if (!transaction || categorize.isPending) {
      return;
    }
    const merchant = transaction.merchant;
    categorize.mutate(
      { id: transaction.id, categoryId, applyToSimilar: withSimilar && similarPending > 0 },
      {
        onSuccess: (result) => {
          setUndoStack((stack) => [{ id: transaction.id, merchant, assignedCategory: categoryId !== null }, ...stack].slice(0, 12));
          toast.success(
            result.updated > 1 ? `${merchant} + ${result.updated - 1} similar reviewed` : `${merchant} reviewed`,
          );
        },
        onError: (error) => toast.error(error.message || "Could not review the transaction"),
      },
    );
  }

  function markTransfer() {
    if (!transaction || categorize.isPending) {
      return;
    }
    const merchant = transaction.merchant;
    categorize.mutate(
      { id: transaction.id, categoryId: null, transferStatus: "transfer", applyToSimilar: false },
      {
        onSuccess: () => {
          setUndoStack((stack) => [{ id: transaction.id, merchant, assignedCategory: false }, ...stack].slice(0, 12));
          toast.success(`${merchant} marked as a transfer`);
        },
        onError: (error) => toast.error(error.message || "Could not mark as transfer"),
      },
    );
  }

  function skip() {
    if (transaction) {
      setSkipIds((ids) => [...ids, transaction.id]);
    }
  }

  function undo(entry: UndoEntry) {
    unreview.mutate(
      { id: entry.id, clearCategory: entry.assignedCategory },
      {
        onSuccess: () => {
          setUndoStack((stack) => stack.filter((item) => item.id !== entry.id));
          setSkipIds((ids) => ids.filter((id) => id !== entry.id));
          toast(`${entry.merchant} back in the queue`);
        },
        onError: (error) => toast.error(error.message || "Could not undo"),
      },
    );
  }

  // keyboard: a accept suggestion, s skip, t transfer, u undo last
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], [role=dialog], [role=combobox]")) {
        return;
      }
      if (event.key === "a" && suggestion) {
        event.preventDefault();
        review(suggestion.id, applyToSimilar);
      } else if (event.key === "s") {
        event.preventDefault();
        skip();
      } else if (event.key === "t") {
        event.preventDefault();
        markTransfer();
      } else if (event.key === "u" && undoStack[0]) {
        event.preventDefault();
        undo(undoStack[0]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.id, suggestion?.id, applyToSimilar, undoStack]);

  const unauthorized = queue.error instanceof ApiError && queue.error.status === 401;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Ledger controls"
        title="Review"
        description={
          remaining > 0
            ? `${remaining.toLocaleString()} transaction${remaining === 1 ? "" : "s"} to triage`
            : undefined
        }
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to review your ledger</p>
          <AuthControls />
        </div>
      ) : queue.isPending ? (
        <PageSkeleton rows={6} />
      ) : queue.isError ? (
        <ErrorState message={queue.error.message} onRetry={() => void queue.refetch()} />
      ) : !transaction ? (
        <EmptyState
          icon={ClipboardCheck}
          title={skipIds.length ? "Queue cleared — skipped items remain" : "All clear"}
          description={
            skipIds.length
              ? `You skipped ${skipIds.length} transaction${skipIds.length === 1 ? "" : "s"} this session.`
              : "Every transaction has been reviewed. The ledger is in order."
          }
          action={
            skipIds.length ? (
              <Button variant="outline" size="sm" onClick={() => setSkipIds([])}>
                Revisit skipped
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card className="relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(110%_70%_at_85%_0%,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_55%)]"
            />
            <CardHeader className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="label-caps">
                    {format(new Date(`${transaction.date}T00:00:00`), "EEEE, MMMM d")} · {transaction.account.displayName}
                  </p>
                  <h2 className="mt-0.5 truncate font-display text-2xl font-semibold md:text-3xl">{transaction.merchant}</h2>
                  {transaction.rawDescription !== transaction.merchant ? (
                    <p className="mt-0.5 truncate font-money text-xs text-muted-foreground">{transaction.rawDescription}</p>
                  ) : null}
                </div>
                <Money amountMinor={transaction.amountMinor} colorBySign className="text-2xl md:text-3xl" />
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              {suggestion ? (
                <button
                  type="button"
                  onClick={() => review(suggestion.id, applyToSimilar)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CategoryIcon size="sm" name={suggestion.name} color={suggestion.color ?? "var(--primary)"} />
                    <span className="truncate text-sm">
                      <span className="font-medium">{suggestion.name}</span>
                      <span className="text-muted-foreground"> — matched {suggestion.basedOn} prior{suggestion.basedOn === 1 ? "" : "s"}</span>
                    </span>
                  </span>
                  <Badge variant="secondary" className="shrink-0 font-money">
                    A
                  </Badge>
                </button>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <CategoryPicker
                  categories={categories.data ?? []}
                  value={null}
                  onSelect={(categoryId) => review(categoryId, applyToSimilar)}
                  allowClear={false}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Check /> Choose category
                    </Button>
                  }
                />
                <Button variant="outline" size="sm" onClick={() => review(null, false)}>
                  Reviewed, no category
                </Button>
                <Button variant="outline" size="sm" onClick={markTransfer}>
                  <ArrowLeftRight /> Transfer <Kbd>T</Kbd>
                </Button>
                <Button variant="ghost" size="sm" onClick={skip}>
                  <SkipForward /> Skip <Kbd>S</Kbd>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRuleDialogOpen(true)}>
                  <Wand2 /> Make a rule
                </Button>
              </div>

              {similarPending > 0 ? (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={applyToSimilar} onCheckedChange={(checked) => setApplyToSimilar(checked === true)} />
                  Apply to {similarPending} similar pending transaction{similarPending === 1 ? "" : "s"}
                </label>
              ) : null}
            </CardContent>
          </Card>

          {similar.length > 0 ? (
            <Card>
              <CardHeader>
                <p className="label-caps">Similar transactions</p>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/60">
                  {similar.slice(0, 8).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">{row.merchant}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(`${row.date}T00:00:00`), "MMM d, yyyy")} ·{" "}
                          {row.needsReview ? (
                            <span className="text-warning">pending</span>
                          ) : (
                            (row.category?.name ?? "Uncategorized")
                          )}
                        </span>
                      </span>
                      <Money amountMinor={row.amountMinor} className={cn("shrink-0 text-xs", row.needsReview && "opacity-70")} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {undoStack.length > 0 ? (
        <Card>
          <CardHeader>
            <p className="label-caps">Recently reviewed</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/60">
              {undoStack.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="truncate">{entry.merchant}</span>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => undo(entry)}>
                    <Undo2 /> Undo
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {transaction && ruleDialogOpen ? (
        <CreateRuleDialog
          key={transaction.id}
          onOpenChange={setRuleDialogOpen}
          merchant={transaction.merchant}
          rawDescription={transaction.rawDescription}
          categories={categories.data ?? []}
        />
      ) : null}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 font-money text-[10px] text-muted-foreground md:inline">
      {children}
    </kbd>
  );
}

function CreateRuleDialog({
  onOpenChange,
  merchant,
  rawDescription,
  categories,
}: {
  onOpenChange: (open: boolean) => void;
  merchant: string;
  rawDescription: string;
  categories: Parameters<typeof CategoryPicker>[0]["categories"];
}) {
  const createRule = useCreateMerchantRule();
  // mounted fresh per transaction (keyed by id), so props seed state directly
  const [name, setName] = useState(`${merchant} rule`);
  const [matchValue, setMatchValue] = useState(rawDescription.slice(0, 60));
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const save = () => {
    if (!categoryId) {
      toast.error("Pick a category for the rule");
      return;
    }
    createRule.mutate(
      { name: name.trim(), matchType: "contains", matchValue: matchValue.trim(), categoryId },
      {
        onSuccess: () => {
          toast.success("Rule saved — future matches categorize themselves");
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message || "Could not save the rule"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create a categorization rule</DialogTitle>
          <DialogDescription>Future imports matching this pattern get the category automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rule-name" className="label-caps">
              Rule name
            </Label>
            <Input id="rule-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rule-match" className="label-caps">
              Description contains
            </Label>
            <Input id="rule-match" value={matchValue} onChange={(event) => setMatchValue(event.target.value)} className="font-money" />
          </div>
          <div className="grid gap-1.5">
            <Label className="label-caps">Category</Label>
            <CategoryPicker categories={categories} value={categoryId} onSelect={setCategoryId} className="w-full" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={createRule.isPending || matchValue.trim().length < 2 || !name.trim()}>
            {createRule.isPending ? "Saving…" : "Save rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

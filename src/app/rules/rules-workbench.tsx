"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Play, Plus, SlidersHorizontal, Trash2, Wand2 } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryPicker } from "@/components/category-picker";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { useCategories } from "@/lib/api/queries/categories";
import { useCreateMerchantRule } from "@/lib/api/queries/review";
import {
  useApplyMerchantRules,
  useCreateCategory,
  useMerchantRules,
  useUpdateCategory,
  useUpdateMerchantRule,
} from "@/lib/api/queries/rules";
import { cn } from "@/lib/utils";

const MATCH_LABEL: Record<string, string> = {
  contains: "contains",
  exact: "is exactly",
  starts_with: "starts with",
};

export function RulesWorkbench() {
  const rules = useMerchantRules();
  const categories = useCategories();
  const apply = useApplyMerchantRules();

  const unauthorized = [rules.error, categories.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Classification"
        title="Rules"
        description="Merchant rules categorize incoming transactions automatically; categories define the taxonomy."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={apply.isPending || (rules.data ?? []).every((rule) => !rule.isActive)}
              onClick={() =>
                apply.mutate(undefined, {
                  onSuccess: (result) =>
                    result.appliedCount > 0
                      ? toast.success(`${result.appliedCount} pending transaction${result.appliedCount === 1 ? "" : "s"} categorized`)
                      : toast("No pending transactions matched the active rules"),
                  onError: (error) => toast.error(error.message || "Apply failed"),
                })
              }
            >
              <Play /> {apply.isPending ? "Applying…" : "Apply to pending"}
            </Button>
            <AddRuleDialog />
          </>
        }
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to manage rules</p>
          <AuthControls />
        </div>
      ) : rules.isPending || categories.isPending ? (
        <PageSkeleton rows={6} />
      ) : rules.isError ? (
        <ErrorState message={rules.error.message} onRetry={() => void rules.refetch()} />
      ) : (
        <>
          <RulesList />
          <CategoriesPanel />
        </>
      )}
    </div>
  );
}

function RulesList() {
  const rules = useMerchantRules();
  const update = useUpdateMerchantRule();
  const rows = rules.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wand2}
        title="No rules yet"
        description="Create one here, or from any transaction in the review queue — future imports then categorize themselves."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="label-caps border-b border-border px-4 py-2">Merchant rules</p>
      <ul>
        {rows.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-b-0",
              !rule.isActive && "opacity-55",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{rule.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                description {MATCH_LABEL[rule.matchType] ?? rule.matchType}{" "}
                <span className="font-money">“{rule.matchValue}”</span> → {rule.categoryName}
                {rule.accountName ? ` · only ${rule.accountName}` : ""}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="font-money text-[10px]" title="Priority">
                p{rule.priority}
              </Badge>
              <Switch
                checked={rule.isActive}
                aria-label={`${rule.name} active`}
                onCheckedChange={(checked) =>
                  update.mutate(
                    { id: rule.id, isActive: checked },
                    { onError: (error) => toast.error(error.message || "Could not update the rule") },
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${rule.name}`}
                onClick={() =>
                  update.mutate(
                    { id: rule.id, action: "delete" },
                    {
                      onSuccess: () => toast.success(`${rule.name} deleted`),
                      onError: (error) => toast.error(error.message || "Could not delete the rule"),
                    },
                  )
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddRuleDialog() {
  const categories = useCategories();
  const createRule = useCreateMerchantRule();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState("contains");
  const [matchValue, setMatchValue] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const save = () => {
    if (!categoryId) {
      return;
    }
    createRule.mutate(
      { name: name.trim(), matchType, matchValue: matchValue.trim(), categoryId },
      {
        onSuccess: () => {
          toast.success("Rule saved");
          setName("");
          setMatchValue("");
          setCategoryId(null);
          setOpen(false);
        },
        onError: (error) => toast.error(error.message || "Could not save the rule"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create a rule</DialogTitle>
          <DialogDescription>When an imported description matches, the category applies automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="new-rule-name" className="label-caps">
              Name
            </Label>
            <Input id="new-rule-name" placeholder="Apple subscriptions" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <div className="grid gap-1.5">
              <Label className="label-caps">Match</Label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts with</SelectItem>
                  <SelectItem value="exact">Exactly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-rule-value" className="label-caps">
                Description text
              </Label>
              <Input
                id="new-rule-value"
                placeholder="APPLE.COM/BILL"
                value={matchValue}
                onChange={(event) => setMatchValue(event.target.value)}
                className="font-money"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="label-caps">Category</Label>
            <CategoryPicker categories={categories.data ?? []} value={categoryId} onSelect={setCategoryId} className="w-full" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim() || matchValue.trim().length < 2 || !categoryId || createRule.isPending}>
            {createRule.isPending ? "Saving…" : "Save rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesPanel() {
  const categories = useCategories();
  const update = useUpdateCategory();
  const rows = categories.data ?? [];
  const active = rows.filter((category) => !category.isArchived);
  const archived = rows.filter((category) => category.isArchived);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="label-caps">Categories</p>
        <AddCategoryControl />
      </div>
      <ul className="grid sm:grid-cols-2">
        {[...active, ...archived].map((category) => (
          <li
            key={category.id}
            className={cn(
              "flex items-center justify-between gap-2 border-b border-border/40 px-4 py-2 sm:odd:border-r",
              category.isArchived && "opacity-50",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <CategoryIcon size="sm" icon={category.icon} name={category.name} color={category.color} />
              <span className="truncate">{category.name}</span>
              {category.isSystem ? (
                <Badge variant="outline" className="h-4 shrink-0 px-1 text-[10px] text-muted-foreground">
                  system
                </Badge>
              ) : null}
            </span>
            {!category.isSystem ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground"
                aria-label={category.isArchived ? `Restore ${category.name}` : `Archive ${category.name}`}
                onClick={() =>
                  update.mutate(
                    { id: category.id, isArchived: !category.isArchived },
                    { onError: (error) => toast.error(error.message || "Could not update the category") },
                  )
                }
              >
                {category.isArchived ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
              </Button>
            ) : (
              <SlidersHorizontal className="size-3 shrink-0 text-muted-foreground/30" aria-hidden />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddCategoryControl() {
  const create = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [flowType, setFlowType] = useState("expense");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Plus /> Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-2" align="end">
        <p className="label-caps">New category</p>
        <Input
          placeholder="Professional Dues"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Category name"
        />
        <Select value={flowType} onValueChange={setFlowType}>
          <SelectTrigger className="w-full" aria-label="Flow type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="w-full"
          disabled={!name.trim() || create.isPending}
          onClick={() =>
            create.mutate(
              { name: name.trim(), flowType },
              {
                onSuccess: () => {
                  toast.success(`${name.trim()} added`);
                  setName("");
                  setOpen(false);
                },
                onError: (error) => toast.error(error.message || "Could not add the category"),
              },
            )
          }
        >
          Add category
        </Button>
      </PopoverContent>
    </Popover>
  );
}

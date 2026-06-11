"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { CategoryPicker } from "@/components/category-picker";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateTransaction } from "@/lib/api/queries/transactions";
import type { ApiCategory, ApiTransaction } from "@/lib/api/types";

export function TransactionSheet({
  transaction,
  categories,
  onClose,
}: {
  transaction: ApiTransaction | null;
  categories: ApiCategory[];
  onClose: () => void;
}) {
  if (!transaction) {
    return <Sheet open={false} onOpenChange={() => onClose()} />;
  }

  // key remounts the form whenever a different transaction opens
  return <TransactionSheetForm key={transaction.id} transaction={transaction} categories={categories} onClose={onClose} />;
}

function TransactionSheetForm({
  transaction,
  categories,
  onClose,
}: {
  transaction: ApiTransaction;
  categories: ApiCategory[];
  onClose: () => void;
}) {
  const update = useUpdateTransaction();

  const [date, setDate] = useState(transaction.date);
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState((transaction.amountMinor / 100).toFixed(2));
  const [categoryId, setCategoryId] = useState<string | null>(transaction.categoryId);
  const [status, setStatus] = useState<ApiTransaction["status"]>(transaction.status);
  const [isTransfer, setIsTransfer] = useState(transaction.transferStatus === "transfer");
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [tags, setTags] = useState(transaction.tags.join(", "));

  const save = () => {
    update.mutate(
      {
        id: transaction.id,
        date,
        merchant: merchant.trim(),
        amount: amount.trim(),
        categoryId,
        reviewStatus: status,
        transferStatus: isTransfer ? "transfer" : "none",
        notes: notes.trim(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          toast.success("Transaction saved");
          onClose();
        },
        onError: (error) => toast.error(error.message || "Could not save the transaction"),
      },
    );
  };

  const remove = () => {
    const id = transaction.id;
    const label = transaction.merchant;
    update.mutate(
      { id, action: "delete" },
      {
        onSuccess: () => {
          onClose();
          toast(`${label} deleted`, {
            action: {
              label: "Undo",
              onClick: () => update.mutate({ id, action: "restore" }),
            },
          });
        },
        onError: (error) => toast.error(error.message || "Could not delete the transaction"),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{transaction.merchant}</SheetTitle>
          <SheetDescription className="flex items-baseline justify-between">
            <span>
              {transaction.account} · {transaction.rawDescription}
            </span>
            <Money amountMinor={transaction.amountMinor} colorBySign className="text-base" />
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="txn-date">
              <Input id="txn-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label="Amount" htmlFor="txn-amount">
              <Input
                id="txn-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="font-money"
              />
            </Field>
          </div>
          <Field label="Merchant" htmlFor="txn-merchant">
            <Input id="txn-merchant" value={merchant} onChange={(event) => setMerchant(event.target.value)} />
          </Field>
          <Field label="Category">
            <CategoryPicker categories={categories} value={categoryId} onSelect={setCategoryId} allowClear className="w-full" />
          </Field>
          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="Status">
              <Select value={status} onValueChange={(value) => setStatus(value as ApiTransaction["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs_review">Needs review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="excluded">Excluded</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <label className="flex h-9 items-center justify-between gap-2 rounded-md border border-input px-3 text-sm">
              Transfer
              <Switch checked={isTransfer} onCheckedChange={setIsTransfer} aria-label="Mark as transfer" />
            </label>
          </div>
          <Field label="Tags" htmlFor="txn-tags" hint="Comma separated">
            <Input id="txn-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tax, reimbursable" />
          </Field>
          <Field label="Notes" htmlFor="txn-notes">
            <Textarea id="txn-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
        </div>

        <SheetFooter className="mt-auto flex-row justify-between gap-2 border-t border-border">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={remove} disabled={update.isPending}>
            <Trash2 /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor} className="label-caps">
          {label}
        </Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { CategoryPicker } from "@/components/category-picker";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTransaction } from "@/lib/api/queries/transactions";
import type { ApiAccount, ApiCategory } from "@/lib/api/types";

export function AddTransactionDialog({ accounts, categories }: { accounts: ApiAccount[]; categories: ApiCategory[] }) {
  const create = useCreateTransaction();
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState("");

  const openAccounts = accounts.filter((account) => account.isActive);
  const categoryName = categories.find((category) => category.id === categoryId)?.name;
  const canSave = Boolean(date && accountId && merchant.trim() && amount.trim());

  const reset = () => {
    setDate(today);
    setMerchant("");
    setAmount("");
    setCategoryId(null);
    setTags("");
  };

  const save = () => {
    create.mutate(
      {
        date,
        accountId,
        merchant: merchant.trim(),
        amount: amount.trim(),
        ...(categoryName ? { categoryName } : {}),
        ...(tags.trim()
          ? {
              tags: tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success(`${merchant.trim()} recorded`);
          reset();
          setOpen(false);
        },
        onError: (error) => toast.error(error.message || "Could not record the transaction"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Add transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Record a transaction</DialogTitle>
          <DialogDescription>Manual entries go straight to the register, flagged for review.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="add-date" className="label-caps">
                Date
              </Label>
              <Input id="add-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-amount" className="label-caps">
                Amount
              </Label>
              <Input
                id="add-amount"
                placeholder="-42.18"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="font-money"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="label-caps">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {openAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="add-merchant" className="label-caps">
              Merchant
            </Label>
            <Input
              id="add-merchant"
              placeholder="Trader Joe's"
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="label-caps">Category</Label>
            <CategoryPicker categories={categories} value={categoryId} onSelect={setCategoryId} allowClear className="w-full" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="add-tags" className="label-caps">
              Tags
            </Label>
            <Input
              id="add-tags"
              placeholder="tax, reimbursable"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave || create.isPending}>
            {create.isPending ? "Saving…" : "Save transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { useCreateAccount } from "@/lib/api/queries/accounts";
import type { ApiAccount } from "@/lib/api/types";

const TYPE_OPTIONS: { value: ApiAccount["type"]; label: string; assetClass: "asset" | "liability" }[] = [
  { value: "checking", label: "Checking", assetClass: "asset" },
  { value: "savings", label: "Savings", assetClass: "asset" },
  { value: "brokerage", label: "Brokerage", assetClass: "asset" },
  { value: "cash", label: "Cash", assetClass: "asset" },
  { value: "credit_card", label: "Credit card", assetClass: "liability" },
  { value: "loan", label: "Loan", assetClass: "liability" },
  { value: "mortgage", label: "Mortgage", assetClass: "liability" },
  { value: "other", label: "Other", assetClass: "asset" },
];

export function AddAccountDialog() {
  const create = useCreateAccount();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [mask, setMask] = useState("");
  const [type, setType] = useState<ApiAccount["type"]>("checking");

  const canSave = name.trim().length > 0 && (!mask || /^\d{2,6}$/.test(mask));

  const save = () => {
    const assetClass = TYPE_OPTIONS.find((option) => option.value === type)?.assetClass ?? "asset";
    create.mutate(
      {
        name: name.trim(),
        ...(institution.trim() ? { institution: institution.trim() } : {}),
        ...(mask.trim() ? { mask: mask.trim() } : {}),
        type,
        assetClass,
        currency: "USD",
      },
      {
        onSuccess: () => {
          toast.success(`${name.trim()} added to the ledger`);
          setName("");
          setInstitution("");
          setMask("");
          setType("checking");
          setOpen(false);
        },
        onError: (error) => toast.error(error.message || "Could not add the account"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Add account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add an account</DialogTitle>
          <DialogDescription>Accounts anchor every transaction and balance snapshot.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="acct-name" className="label-caps">
              Name
            </Label>
            <Input id="acct-name" placeholder="Operating Checking" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="acct-institution" className="label-caps">
                Institution
              </Label>
              <Input
                id="acct-institution"
                placeholder="Bank or brokerage"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acct-mask" className="label-caps">
                Last digits
              </Label>
              <Input
                id="acct-mask"
                placeholder="1842"
                inputMode="numeric"
                value={mask}
                onChange={(event) => setMask(event.target.value)}
                className="font-money"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="label-caps">Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ApiAccount["type"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave || create.isPending}>
            {create.isPending ? "Saving…" : "Save account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

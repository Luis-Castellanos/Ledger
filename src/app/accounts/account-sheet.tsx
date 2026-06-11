"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Archive, ArchiveRestore, ReceiptText } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { AnimatedMoney, Money } from "@/components/money";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateBalanceSnapshot, useUpdateAccount } from "@/lib/api/queries/accounts";
import type { ApiAccount, ApiBalanceSnapshot } from "@/lib/api/types";

const balanceChartConfig = {
  balance: { label: "Balance", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function AccountSheet({
  account,
  snapshots,
  onClose,
}: {
  account: ApiAccount | null;
  snapshots: ApiBalanceSnapshot[];
  onClose: () => void;
}) {
  if (!account) {
    return <Sheet open={false} onOpenChange={() => onClose()} />;
  }
  return <AccountSheetBody key={account.id} account={account} snapshots={snapshots} onClose={onClose} />;
}

function AccountSheetBody({
  account,
  snapshots,
  onClose,
}: {
  account: ApiAccount;
  snapshots: ApiBalanceSnapshot[];
  onClose: () => void;
}) {
  const update = useUpdateAccount();
  const createSnapshot = useCreateBalanceSnapshot();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [balance, setBalance] = useState("");

  const accountSnapshots = snapshots
    .filter((snapshot) => snapshot.accountId === account.id)
    .sort((left, right) => (left.asOfDate < right.asOfDate ? -1 : 1));
  const latest = accountSnapshots[accountSnapshots.length - 1];
  const chartData = accountSnapshots.map((snapshot) => ({
    date: snapshot.asOfDate,
    balance: snapshot.balanceMinor / 100,
  }));

  const recordSnapshot = () => {
    createSnapshot.mutate(
      { accountId: account.id, asOfDate, balance: balance.trim() },
      {
        onSuccess: () => {
          toast.success(`Balance recorded for ${account.name}`);
          setBalance("");
        },
        onError: (error) => toast.error(error.message || "Could not record the balance"),
      },
    );
  };

  const setLifecycle = (action: "close" | "reopen") => {
    update.mutate(
      { id: account.id, action },
      {
        onSuccess: () => toast.success(action === "close" ? `${account.name} closed` : `${account.name} reopened`),
        onError: (error) => toast.error(error.message || "Could not update the account"),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            {account.name}
            {!account.isActive ? <Badge variant="outline">closed</Badge> : null}
          </SheetTitle>
          <SheetDescription>
            {[account.institution, account.mask ? `…${account.mask}` : null, account.type.replace("_", " ")]
              .filter(Boolean)
              .join(" · ")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div>
            <p className="label-caps">Current position</p>
            {latest ? (
              <>
                <div className="font-display text-3xl font-semibold">
                  <AnimatedMoney amountMinor={latest.balanceMinor} className="font-display" />
                </div>
                <p className="text-xs text-muted-foreground">as of {format(new Date(`${latest.asOfDate}T00:00:00`), "MMMM d, yyyy")}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No balance recorded yet — add the first snapshot below.</p>
            )}
          </div>

          {chartData.length >= 2 ? (
            <ChartContainer config={balanceChartConfig} className="h-28 w-full">
              <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4 }}>
                <defs>
                  <linearGradient id="accountBalanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => format(new Date(`${value}T00:00:00`), "MMM d, yyyy")}
                      formatter={(value) => [
                        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value)),
                        " balance",
                      ]}
                    />
                  }
                />
                <Area
                  dataKey="balance"
                  type="stepAfter"
                  stroke="var(--chart-2)"
                  strokeWidth={1.5}
                  fill="url(#accountBalanceFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          ) : null}

          <div className="grid gap-2 rounded-lg border border-border p-3">
            <p className="label-caps">Record a balance</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="snap-date" className="text-xs text-muted-foreground">
                  As of
                </Label>
                <Input id="snap-date" type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="snap-balance" className="text-xs text-muted-foreground">
                  Balance
                </Label>
                <Input
                  id="snap-balance"
                  placeholder="1250.42"
                  inputMode="decimal"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  className="font-money"
                />
              </div>
            </div>
            <Button size="sm" onClick={recordSnapshot} disabled={!balance.trim() || !asOfDate || createSnapshot.isPending}>
              {createSnapshot.isPending ? "Saving…" : "Save snapshot"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/transactions?account=${encodeURIComponent(account.name)}`}>
                <ReceiptText /> Register
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-positive">
              <Link href={`/transactions?account=${encodeURIComponent(account.name)}&direction=inflow`}>
                <ArrowDownLeft /> Inflows
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-negative">
              <Link href={`/transactions?account=${encodeURIComponent(account.name)}&direction=outflow`}>
                <ArrowUpRight /> Outflows
              </Link>
            </Button>
          </div>

          {accountSnapshots.length > 0 ? (
            <div>
              <p className="label-caps mb-1">Balance history</p>
              <ul className="divide-y divide-border/60">
                {[...accountSnapshots].reverse().slice(0, 10).map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground">{format(new Date(`${snapshot.asOfDate}T00:00:00`), "MMM d, yyyy")}</span>
                    <Money amountMinor={snapshot.balanceMinor} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-border pt-3">
            {account.isActive ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={update.isPending}>
                    <Archive /> Close account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close {account.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      History stays intact and the account can be reopened at any time. Closed accounts stop appearing in
                      active lists.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep open</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setLifecycle("close")}>Close account</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setLifecycle("reopen")} disabled={update.isPending}>
                <ArchiveRestore /> Reopen account
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

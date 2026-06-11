"use client";

import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Plus, Target, Trash2 } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { ApiError } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal, type ApiGoal } from "@/lib/api/queries/budgets";
import { cn } from "@/lib/utils";

export function GoalsWorkbench() {
  const goals = useGoals();
  const unauthorized = goals.error instanceof ApiError && goals.error.status === 401;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Plan"
        title="Goals"
        description="Savings targets with a finish line."
        actions={<CreateGoalDialog />}
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to set goals</p>
          <AuthControls />
        </div>
      ) : goals.isPending ? (
        <PageSkeleton rows={4} />
      ) : goals.isError ? (
        <ErrorState message={goals.error.message} onRetry={() => void goals.refetch()} />
      ) : goals.data.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="An emergency fund, a trip, a down payment — give a number a deadline and track it here."
          action={<CreateGoalDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.data.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: ApiGoal }) {
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const achieved = goal.status === "achieved" || goal.percent >= 100;
  const daysLeft = goal.targetDate ? differenceInCalendarDays(new Date(`${goal.targetDate}T00:00:00`), new Date()) : null;

  return (
    <Card className={cn("relative overflow-hidden", achieved && "border-positive/40")}>
      <CardHeader className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="truncate">{goal.name}</span>
            {achieved ? <CheckCircle2 className="size-4 shrink-0 text-positive" /> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {goal.accountName ? `Funded by ${goal.accountName}` : "Manual contributions"}
            {goal.targetDate
              ? ` · ${
                  daysLeft !== null && daysLeft >= 0
                    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                    : `was due ${format(new Date(`${goal.targetDate}T00:00:00`), "MMM d, yyyy")}`
                }`
              : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${goal.name}`}
          onClick={() =>
            remove.mutate(goal.id, {
              onSuccess: () => toast.success(`${goal.name} removed`),
              onError: (error) => toast.error(error.message || "Could not delete the goal"),
            })
          }
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <ProgressRing percent={goal.percent} progressMinor={goal.progressMinor} targetMinor={goal.targetAmountMinor} />
        <div className="flex items-center justify-between gap-2">
          {!goal.accountId ? <ContributeControl goal={goal} busy={update.isPending} /> : <span />}
          {achieved && goal.status !== "achieved" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-positive"
              onClick={() =>
                update.mutate(
                  { id: goal.id, status: "achieved" },
                  { onSuccess: () => toast.success(`${goal.name} marked achieved 🎉`) },
                )
              }
            >
              Mark achieved
            </Button>
          ) : (
            <Badge variant="outline" className="font-money text-[10px]">
              {goal.percent}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressRing({ percent, progressMinor, targetMinor }: { percent: number; progressMinor: number; targetMinor: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`${percent}% of goal`}>
        <circle cx="42" cy="42" r={radius} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={percent >= 100 ? "var(--positive)" : "var(--primary)"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 42 42)"
          style={{ transition: "stroke-dasharray 300ms ease-out" }}
        />
        <text
          x="42"
          y="46"
          textAnchor="middle"
          className="fill-foreground font-money"
          style={{ fontSize: "14px", fontWeight: 600 }}
        >
          {percent}%
        </text>
      </svg>
      <div>
        <p className="text-xl font-semibold">
          <Money amountMinor={progressMinor} />
        </p>
        <p className="text-xs text-muted-foreground">
          of <Money amountMinor={targetMinor} /> target
        </p>
      </div>
    </div>
  );
}

function ContributeControl({ goal, busy }: { goal: ApiGoal; busy: boolean }) {
  const update = useUpdateGoal();
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Contribute
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2" align="start">
        <p className="label-caps">Add to {goal.name}</p>
        <Input
          placeholder="100.00"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="font-money"
          aria-label={`Contribution to ${goal.name}`}
        />
        <Button
          size="sm"
          className="w-full"
          disabled={!amount.trim() || busy}
          onClick={() =>
            update.mutate(
              { id: goal.id, contribute: amount.trim() },
              {
                onSuccess: () => {
                  toast.success(`Contribution recorded`);
                  setAmount("");
                  setOpen(false);
                },
                onError: (error) => toast.error(error.message || "Could not record the contribution"),
              },
            )
          }
        >
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function CreateGoalDialog() {
  const create = useCreateGoal();
  const accounts = useAccounts();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [accountId, setAccountId] = useState("");
  const [starting, setStarting] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const save = () => {
    create.mutate(
      {
        name: name.trim(),
        targetAmount: target.trim(),
        ...(accountId ? { accountId, ...(starting.trim() ? { startingAmount: starting.trim() } : {}) } : {}),
        ...(targetDate ? { targetDate } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`${name.trim()} — target set`);
          setName("");
          setTarget("");
          setAccountId("");
          setStarting("");
          setTargetDate("");
          setOpen(false);
        },
        onError: (error) => toast.error(error.message || "Could not create the goal"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Set a goal</DialogTitle>
          <DialogDescription>
            Link a savings account to track progress from its balance, or leave it unlinked and log contributions by hand.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="goal-name" className="label-caps">
              Name
            </Label>
            <Input id="goal-name" placeholder="Emergency fund" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-target" className="label-caps">
                Target
              </Label>
              <Input
                id="goal-target"
                placeholder="10,000"
                inputMode="decimal"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="font-money"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-date" className="label-caps">
                By when (optional)
              </Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="label-caps">Funding account (optional)</Label>
            <Select value={accountId || "__none"} onValueChange={(value) => setAccountId(value === "__none" ? "" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Track contributions manually</SelectItem>
                {(accounts.data ?? [])
                  .filter((account) => account.isActive)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {accountId ? (
            <div className="grid gap-1.5">
              <Label htmlFor="goal-start" className="label-caps">
                Balance already counted (optional)
              </Label>
              <Input
                id="goal-start"
                placeholder="0.00"
                inputMode="decimal"
                value={starting}
                onChange={(event) => setStarting(event.target.value)}
                className="font-money"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim() || !target.trim() || create.isPending}>
            {create.isPending ? "Saving…" : "Set goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

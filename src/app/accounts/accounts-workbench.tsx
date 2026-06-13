"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Landmark } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/api/client";
import { useAccounts, useBalanceSnapshots } from "@/lib/api/queries/accounts";
import type { ApiAccount, ApiBalanceSnapshot } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { AccountSheet } from "./account-sheet";
import { AddAccountDialog } from "./add-account-dialog";

const TYPE_FILTERS = [
  { key: "", label: "All" },
  { key: "checking", label: "Checking" },
  { key: "savings", label: "Savings" },
  { key: "credit_card", label: "Cards" },
  { key: "brokerage", label: "Brokerage" },
  { key: "loans", label: "Loans" },
] as const;

export function AccountsWorkbench({
  initialAccountName,
  initialType,
}: {
  initialAccountName: string;
  initialType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const accounts = useAccounts();
  const snapshots = useBalanceSnapshots();

  const [typeFilter, setTypeFilter] = useState(initialType === "loan" || initialType === "mortgage" ? "loans" : initialType);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [openedFromLink, setOpenedFromLink] = useState(false);

  // deep links like /accounts?account=Rewards%20Card open the detail sheet
  // (state adjusted during render, once, when account data first arrives)
  if (!openedFromLink && initialAccountName && accounts.data) {
    const match = accounts.data.find((account) => account.name === initialAccountName);
    if (match) {
      setActiveAccountId(match.id);
    }
    setOpenedFromLink(true);
  }

  useEffect(() => {
    router.replace(`${pathname}${typeFilter ? `?type=${typeFilter}` : ""}`, { scroll: false });
  }, [typeFilter, pathname, router]);

  const unauthorized = [accounts.error, snapshots.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  const latestByAccount = new Map<string, ApiBalanceSnapshot>();
  for (const snapshot of snapshots.data ?? []) {
    if (!latestByAccount.has(snapshot.accountId)) {
      latestByAccount.set(snapshot.accountId, snapshot);
    }
  }

  const allAccounts = accounts.data ?? [];
  const filtered = allAccounts.filter((account) => {
    if (!typeFilter) return true;
    if (typeFilter === "loans") return account.type === "loan" || account.type === "mortgage";
    return account.type === typeFilter;
  });
  const assets = filtered.filter((account) => account.assetClass === "asset");
  const liabilities = filtered.filter((account) => account.assetClass === "liability");

  const sum = (rows: ApiAccount[]) =>
    rows.reduce((total, account) => total + (latestByAccount.get(account.id)?.balanceMinor ?? 0), 0);
  const assetsTotal = sum(assets.filter((account) => account.isActive));
  const liabilitiesTotal = sum(liabilities.filter((account) => account.isActive));

  const activeAccount = allAccounts.find((account) => account.id === activeAccountId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Ledger sources"
        title="Accounts"
        description={allAccounts.length ? `${allAccounts.length} account${allAccounts.length === 1 ? "" : "s"} on file` : undefined}
        actions={<AddAccountDialog />}
      />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to manage accounts</p>
          <AuthControls />
        </div>
      ) : accounts.isPending || snapshots.isPending ? (
        <PageSkeleton rows={6} />
      ) : accounts.isError ? (
        <ErrorState message={accounts.error.message} onRetry={() => void accounts.refetch()} />
      ) : allAccounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Add your checking, savings, cards, and brokerage accounts — they anchor everything else."
          action={<AddAccountDialog />}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Assets" amountMinor={assetsTotal} tone="positive" />
            <SummaryCard label="Liabilities" amountMinor={liabilitiesTotal} tone="negative" />
            <SummaryCard label="Net" amountMinor={assetsTotal + liabilitiesTotal} tone="auto" />
          </div>

          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={typeFilter || ""}
            onValueChange={(value) => setTypeFilter(value)}
            aria-label="Account type filter"
            className="flex-wrap justify-start"
          >
            {TYPE_FILTERS.map((option) => (
              <ToggleGroupItem key={option.key || "all"} value={option.key} className="px-3 text-xs">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {filtered.length === 0 ? (
            <EmptyState title="No accounts of this type" className="py-10" />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
              {assets.length > 0 ? (
                <AccountGroup
                  label="Assets"
                  accounts={assets}
                  latestByAccount={latestByAccount}
                  onOpen={(account) => setActiveAccountId(account.id)}
                />
              ) : null}
              {liabilities.length > 0 ? (
                <AccountGroup
                  label="Liabilities"
                  accounts={liabilities}
                  latestByAccount={latestByAccount}
                  onOpen={(account) => setActiveAccountId(account.id)}
                />
              ) : null}
            </div>
          )}
        </>
      )}

      <AccountSheet account={activeAccount} snapshots={snapshots.data ?? []} onClose={() => setActiveAccountId(null)} />
    </div>
  );
}

function SummaryCard({ label, amountMinor, tone }: { label: string; amountMinor: number; tone: "positive" | "negative" | "auto" }) {
  const color =
    tone === "auto" ? (amountMinor >= 0 ? "text-positive" : "text-negative") : tone === "positive" ? "text-positive" : "text-negative";
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="label-caps">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", color)}>
          <Money amountMinor={amountMinor} />
        </p>
      </CardContent>
    </Card>
  );
}

function AccountGroup({
  label,
  accounts,
  latestByAccount,
  onOpen,
}: {
  label: string;
  accounts: ApiAccount[];
  latestByAccount: Map<string, ApiBalanceSnapshot>;
  onOpen: (account: ApiAccount) => void;
}) {
  const open = accounts.filter((account) => account.isActive);
  const closed = accounts.filter((account) => !account.isActive);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="label-caps border-b border-border px-4 py-2">{label}</p>
      <ul>
        {[...open, ...closed].map((account) => {
          const latest = latestByAccount.get(account.id);
          return (
            <li key={account.id}>
              <button
                type="button"
                onClick={() => onOpen(account)}
                aria-label={`View ${account.name} detail`}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50",
                  !account.isActive && "opacity-55",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{account.name}</span>
                    {!account.isActive ? (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        closed
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[account.institution, account.mask ? `…${account.mask}` : null, account.type.replace("_", " ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {latest ? (
                    <>
                      <Money amountMinor={latest.balanceMinor} className="block text-sm" />
                      <span className="font-money text-[10px] text-muted-foreground">
                        {format(new Date(`${latest.asOfDate}T00:00:00`), "MMM d")}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">no balance</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

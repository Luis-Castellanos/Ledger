"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { sampleAccounts, type AccountRow } from "@/lib/finance/account-sample-data";
import { formatMoney } from "@/lib/finance/money";
import { buildNetWorthSummary, getBalanceEvidenceSource, type BalanceEvidenceSource } from "@/lib/finance/reports";

export function NetWorthWorkbench() {
  const [accounts, setAccounts] = useState<AccountRow[]>(sampleAccounts);
  const [snapshots, setSnapshots] = useState<DatabaseSnapshot[]>([]);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");

  useEffect(() => {
    let isMounted = true;

    async function loadAccounts() {
      try {
        const [accountsResponse, snapshotsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/balance-snapshots", { headers: { Accept: "application/json" } }),
        ]);

        if (!accountsResponse.ok || !snapshotsResponse.ok) {
          throw new Error("Account API unavailable");
        }

        const [accountPayload, snapshotPayload] = (await Promise.all([accountsResponse.json(), snapshotsResponse.json()])) as [
          { accounts: DatabaseAccount[] },
          { snapshots: DatabaseSnapshot[] },
        ];

        if (isMounted) {
          setAccounts(accountPayload.accounts.map((account) => toAccountRow(account, snapshotPayload.snapshots)));
          setSnapshots(snapshotPayload.snapshots);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setAccounts(sampleAccounts);
          setDataSource("demo");
        }
      }
    }

    void loadAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const latestSnapshotByAccount = useMemo(() => {
    const latest = new Map<string, DatabaseSnapshot>();

    for (const snapshot of snapshots) {
      const existing = latest.get(snapshot.accountId);

      if (!existing || snapshot.asOfDate > existing.asOfDate) {
        latest.set(snapshot.accountId, snapshot);
      }
    }

    return latest;
  }, [snapshots]);

  const summary = useMemo(() => buildNetWorthSummary(accounts), [accounts]);

  const recentSnapshots = useMemo(() => {
    return [...snapshots]
      .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6);
  }, [snapshots]);

  const snapshotCoverage = accounts.length === 0 ? 0 : Math.round((latestSnapshotByAccount.size / accounts.length) * 100);
  const latestSnapshotDate = recentSnapshots[0]?.asOfDate ?? "No snapshots";
  const accountsWithoutSnapshots = Math.max(accounts.length - latestSnapshotByAccount.size, 0);

  return (
    <div className="accounts-grid">
      <section className="accounts-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <NetWorthMetric label="Assets" value={formatMoney(summary.assets)} icon={<ArrowUpRight size={17} />} tone="green" />
          <NetWorthMetric label="Liabilities" value={formatMoney(-summary.liabilities)} icon={<ArrowDownLeft size={17} />} tone="coral" />
          <NetWorthMetric label="Net worth" value={formatMoney(summary.netWorth)} icon={<ShieldCheck size={17} />} tone="violet" />
        </div>

        <section className="panel accounts-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Net worth</p>
              <h2 className="panel-title">Account position</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
          </div>
          <div className="accounts-table net-worth-table" role="table" aria-label="Net worth accounts">
            <div className="accounts-table-head" role="row">
              <span>Account</span>
              <span>Type</span>
              <span>Class</span>
              <span>Evidence</span>
              <span>Balance</span>
            </div>
            {accounts.map((account) => {
              const evidenceSource = getBalanceEvidenceSource(account, latestSnapshotByAccount.get(account.id));

              return (
              <div className="accounts-table-row" role="row" key={account.id}>
                <a className="account-name-cell report-drilldown" href={`/accounts?account=${encodeURIComponent(account.name)}`}>
                  <div className="account-icon">
                    <Landmark size={17} />
                  </div>
                  <div className="min-w-0">
                    <p>{account.name}</p>
                    <span>
                      {account.institution} • {account.mask} • {account.lastActivity}
                    </span>
                  </div>
                </a>
                <span className="account-pill">{account.type.replace("_", " ")}</span>
                <span className={account.assetClass === "asset" ? "amount-positive" : "amount-negative"}>
                  {account.assetClass}
                  {account.status === "closed" ? " / closed" : ""}
                </span>
                <span className="account-pill">{getBalanceEvidenceLabel(evidenceSource)}</span>
                <strong className={account.balanceMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(account.balanceMinor)}</strong>
              </div>
              );
            })}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Snapshot coverage</p>
              <h2 className="panel-title">Position evidence</h2>
            </div>
          </div>
          <div className="settings-facts">
            <div>
              <span>Coverage</span>
              <strong>{snapshotCoverage}% of accounts</strong>
            </div>
            <div>
              <span>Latest snapshot</span>
              <strong>{latestSnapshotDate}</strong>
            </div>
            <div>
              <span>Missing evidence</span>
              <strong>{accountsWithoutSnapshots} accounts</strong>
            </div>
          </div>
        </section>

        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Recent snapshots</p>
              <h2 className="panel-title">Balance evidence</h2>
            </div>
          </div>
          <div className="snapshot-list">
            {recentSnapshots.length > 0 ? (
              recentSnapshots.map((snapshot) => (
                <div className="snapshot-item" key={`${snapshot.accountId}-${snapshot.asOfDate}`}>
                  <div className="snapshot-copy">
                    <span>{snapshot.accountName}</span>
                    <small>{snapshot.asOfDate}</small>
                  </div>
                  <strong>{formatMoney(snapshot.balanceMinor, snapshot.currency)}</strong>
                </div>
              ))
            ) : (
              <p className="empty-copy">No manual balance snapshots yet.</p>
            )}
          </div>
        </section>

        <section className="panel account-form-panel">
          <div className="account-checklist-item">
            <WalletCards size={17} />
            <span>Net worth uses the latest balance snapshot per account.</span>
          </div>
          <div className="account-checklist-item">
            <ShieldCheck size={17} />
            <span>Reports use ledger-scoped API data when credentials are configured.</span>
          </div>
          <div className="account-checklist-item">
            <CalendarDays size={17} />
            <span>Accounts without snapshots stay visible with a zero balance until evidence is entered.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

type DatabaseAccount = {
  id: string;
  name: string;
  institution: string | null;
  mask: string | null;
  type: string;
  assetClass: "asset" | "liability";
  currency: string;
  isHidden: boolean;
  closedOn: string | null;
  isActive: boolean;
  updatedAt?: string | Date;
};

type DatabaseSnapshot = {
  id: string;
  ledgerId: string;
  accountId: string;
  accountName: string;
  asOfDate: string;
  balanceMinor: number;
  currency: string;
  source: string;
  createdAt: string;
};

function toAccountRow(account: DatabaseAccount, snapshots: DatabaseSnapshot[] = []): AccountRow {
  const latestSnapshot = snapshots
    .filter((snapshot) => snapshot.accountId === account.id)
    .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate))[0];

  return {
    id: account.id,
    name: account.name,
    institution: account.institution ?? "Manual",
    mask: account.mask ?? "0000",
    type: account.type,
    assetClass: account.assetClass,
    currency: account.currency,
    balanceMinor: latestSnapshot?.balanceMinor ?? 0,
    lastActivity: latestSnapshot ? `Snapshot ${latestSnapshot.asOfDate}` : account.updatedAt ? "Updated" : "No snapshot",
    status: account.closedOn || !account.isActive ? "closed" : account.isHidden ? "hidden" : "active",
  };
}

function getBalanceEvidenceLabel(source: BalanceEvidenceSource) {
  if (source === "manual_snapshot") {
    return "Manual snapshot";
  }

  if (source === "imported_snapshot") {
    return "Imported snapshot";
  }

  if (source === "missing_snapshot") {
    return "Missing evidence";
  }

  return "Transaction-derived";
}

function NetWorthMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

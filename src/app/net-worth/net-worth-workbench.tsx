"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { sampleAccounts, type AccountRow } from "@/lib/finance/account-sample-data";
import { formatMoney } from "@/lib/finance/money";

export function NetWorthWorkbench() {
  const [accounts, setAccounts] = useState<AccountRow[]>(sampleAccounts);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");

  useEffect(() => {
    let isMounted = true;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounts", { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error("Account API unavailable");
        }

        const payload = (await response.json()) as { accounts: DatabaseAccount[] };

        if (isMounted) {
          setAccounts(payload.accounts.map(toAccountRow));
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

  const summary = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        if (account.assetClass === "liability") {
          acc.liabilities += Math.abs(account.balanceMinor);
        } else {
          acc.assets += account.balanceMinor;
        }

        return acc;
      },
      { assets: 0, liabilities: 0 },
    );
  }, [accounts]);

  return (
    <div className="accounts-grid">
      <section className="accounts-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <NetWorthMetric label="Assets" value={formatMoney(summary.assets)} icon={<ArrowUpRight size={17} />} tone="green" />
          <NetWorthMetric label="Liabilities" value={formatMoney(-summary.liabilities)} icon={<ArrowDownLeft size={17} />} tone="coral" />
          <NetWorthMetric label="Net worth" value={formatMoney(summary.assets - summary.liabilities)} icon={<ShieldCheck size={17} />} tone="violet" />
        </div>

        <section className="panel accounts-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Net worth</p>
              <h2 className="panel-title">Account position</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
          </div>
          <div className="accounts-table" role="table" aria-label="Net worth accounts">
            <div className="accounts-table-head" role="row">
              <span>Account</span>
              <span>Type</span>
              <span>Class</span>
              <span>Balance</span>
            </div>
            {accounts.map((account) => (
              <div className="accounts-table-row" role="row" key={account.id}>
                <div className="account-name-cell">
                  <div className="account-icon">
                    <Landmark size={17} />
                  </div>
                  <div className="min-w-0">
                    <p>{account.name}</p>
                    <span>
                      {account.institution} • {account.mask}
                    </span>
                  </div>
                </div>
                <span className="account-pill">{account.type.replace("_", " ")}</span>
                <span className={account.assetClass === "asset" ? "amount-positive" : "amount-negative"}>{account.assetClass}</span>
                <strong className={account.balanceMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(account.balanceMinor)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="account-checklist-item">
            <WalletCards size={17} />
            <span>Current balances use account records until balance snapshots are wired.</span>
          </div>
          <div className="account-checklist-item">
            <ShieldCheck size={17} />
            <span>Reports use ledger-scoped API data when credentials are configured.</span>
          </div>
          <div className="account-checklist-item">
            <Landmark size={17} />
            <span>Historical snapshot charts are the next reporting upgrade.</span>
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
};

function toAccountRow(account: DatabaseAccount): AccountRow {
  return {
    id: account.id,
    name: account.name,
    institution: account.institution ?? "Manual",
    mask: account.mask ?? "0000",
    type: account.type,
    assetClass: account.assetClass,
    currency: account.currency,
    balanceMinor: 0,
    lastActivity: "No activity",
    status: account.isHidden ? "hidden" : "active",
  };
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

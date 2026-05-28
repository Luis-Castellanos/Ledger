"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  EyeOff,
  Landmark,
  Plus,
  Save,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { sampleAccounts, type AccountRow } from "@/lib/finance/account-sample-data";
import { createAccountSchema } from "@/lib/finance/account";
import { formatMoney } from "@/lib/finance/money";

const accountTypes = [
  { label: "Checking", value: "checking" },
  { label: "Savings", value: "savings" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Cash", value: "cash" },
  { label: "Brokerage", value: "brokerage" },
  { label: "Loan", value: "loan" },
  { label: "Mortgage", value: "mortgage" },
  { label: "Other", value: "other" },
];

const assetClasses = [
  { label: "Asset", value: "asset" },
  { label: "Liability", value: "liability" },
];

export function AccountsWorkbench() {
  const [accounts, setAccounts] = useState<AccountRow[]>(sampleAccounts);
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [formState, setFormState] = useState({
    name: "",
    institution: "",
    mask: "",
    type: "checking",
    assetClass: "asset",
    currency: "USD",
  });
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounts", { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error("Account API unavailable");
        }

        const payload = (await response.json()) as { accounts: DatabaseAccount[] };
        const nextAccounts = payload.accounts.map(toAccountRow);

        if (isMounted && !hasLocalEdits.current) {
          setAccounts(nextAccounts);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setDataSource("demo");
        }
      }
    }

    void loadAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return accounts;
    }

    return accounts.filter((account) =>
      [account.name, account.institution, account.type, account.mask].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [accounts, query]);

  const totals = useMemo(() => {
    return accounts.reduce(
      (summary, account) => {
        if (account.assetClass === "liability") {
          summary.liabilities += Math.abs(account.balanceMinor);
        } else {
          summary.assets += account.balanceMinor;
        }

        return summary;
      },
      { assets: 0, liabilities: 0 },
    );
  }, [accounts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createAccountSchema.safeParse({
      ...formState,
      institution: formState.institution || undefined,
      mask: formState.mask || undefined,
    });

    if (!parsed.success) {
      setError("Check the required fields and use a numeric 2-6 digit mask.");
      return;
    }

    setIsSaving(true);
    hasLocalEdits.current = true;

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Account API unavailable");
      }

      const payload = (await response.json()) as { account: DatabaseAccount };
      setAccounts((current) => [toAccountRow(payload.account), ...current]);
      setDataSource("database");
      setFormState({ name: "", institution: "", mask: "", type: "checking", assetClass: "asset", currency: "USD" });
      setError(null);
    } catch {
      const nextAccount: AccountRow = {
        id: `local_${Date.now()}`,
        name: parsed.data.name,
        institution: parsed.data.institution ?? "Manual",
        mask: parsed.data.mask ?? "0000",
        type: parsed.data.type,
        assetClass: parsed.data.assetClass,
        currency: parsed.data.currency,
        balanceMinor: 0,
        lastActivity: "Just now",
        status: parsed.data.isHidden ? "hidden" : "active",
      };

      setAccounts((current) => [nextAccount, ...current]);
      setDataSource("demo");
      setFormState({ name: "", institution: "", mask: "", type: "checking", assetClass: "asset", currency: "USD" });
      setError("Saved in local demo mode. Configure Clerk and DATABASE_URL to persist accounts.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="accounts-grid">
      <section className="accounts-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <AccountMetric label="Assets" value={formatMoney(totals.assets)} icon={<ArrowUpRight size={17} />} tone="green" />
          <AccountMetric label="Liabilities" value={formatMoney(-totals.liabilities)} icon={<ArrowDownLeft size={17} />} tone="coral" />
          <AccountMetric label="Net position" value={formatMoney(totals.assets - totals.liabilities)} icon={<ShieldCheck size={17} />} tone="violet" />
        </div>

        <section className="panel accounts-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Accounts</p>
              <h2 className="panel-title">Balance control file</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search accounts" placeholder="Search accounts" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="accounts-table" role="table" aria-label="Accounts">
            <div className="accounts-table-head" role="row">
              <span>Account</span>
              <span>Type</span>
              <span>Class</span>
              <span>Balance</span>
            </div>
            {filteredAccounts.map((account) => (
              <div className="accounts-table-row" role="row" key={account.id}>
                <div className="account-name-cell">
                  <div className="account-icon">{account.type === "credit_card" ? <CreditCard size={17} /> : <Landmark size={17} />}</div>
                  <div className="min-w-0">
                    <p>{account.name}</p>
                    <span>
                      {account.institution} • {account.mask} • {account.lastActivity}
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
          <div className="panel-header">
            <div>
              <p className="panel-label">New account</p>
              <h2 className="panel-title">Register source</h2>
            </div>
            <div className="summary-icon">
              <Plus size={17} />
            </div>
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                required
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                placeholder="Operating Checking"
              />
            </label>
            <label>
              <span>Institution</span>
              <input
                value={formState.institution}
                onChange={(event) => setFormState((current) => ({ ...current, institution: event.target.value }))}
                placeholder="Bank or brokerage"
              />
            </label>
            <label>
              <span>Mask</span>
              <input
                inputMode="numeric"
                value={formState.mask}
                onChange={(event) => setFormState((current) => ({ ...current, mask: event.target.value }))}
                placeholder="1842"
              />
            </label>
            <div className="account-form-grid">
              <label>
                <span>Type</span>
                <select value={formState.type} onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value }))}>
                  {accountTypes.map((type) => (
                    <option value={type.value} key={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Class</span>
                <select
                  value={formState.assetClass}
                  onChange={(event) => setFormState((current) => ({ ...current, assetClass: event.target.value }))}
                >
                  {assetClasses.map((assetClass) => (
                    <option value={assetClass.value} key={assetClass.value}>
                      {assetClass.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Currency</span>
              <input
                required
                maxLength={3}
                value={formState.currency}
                onChange={(event) => setFormState((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-action" type="submit">
              <Save size={16} />
              {isSaving ? "Saving" : "Save account"}
            </button>
          </form>
        </section>

        <section className="panel account-form-panel">
          <div className="account-checklist-item">
            <Building2 size={17} />
            <span>Institution names stay user-controlled until bank sync exists.</span>
          </div>
          <div className="account-checklist-item">
            <WalletCards size={17} />
            <span>Every import and transaction will require an account source.</span>
          </div>
          <div className="account-checklist-item">
            <EyeOff size={17} />
            <span>Hidden accounts remain available for historical reporting.</span>
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
  updatedAt?: string | Date;
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
    lastActivity: account.updatedAt ? "Updated" : "No activity",
    status: account.isHidden ? "hidden" : "active",
  };
}

function AccountMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

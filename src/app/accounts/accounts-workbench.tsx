"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
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
import { createAccountSchema, createBalanceSnapshotSchema } from "@/lib/finance/account";
import { formatMoney } from "@/lib/finance/money";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { canUseLocalFallback, dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, productionFallbackMessage, type DataSourceState } from "@/lib/demo-fallback";

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

export function AccountsWorkbench({ initialAccount = "" }: { initialAccount?: string }) {
  const initialSelectedAccountId = getInitialAccountId(initialAccount);
  const [accounts, setAccounts] = useState<AccountRow[]>(() => demoFallback(sampleAccounts, []));
  const [snapshots, setSnapshots] = useState<DatabaseSnapshot[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>(() => demoFallback(sampleTransactionRows, []));
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccountId);
  const [formState, setFormState] = useState({
    name: "",
    institution: "",
    mask: "",
    type: "checking",
    assetClass: "asset",
    currency: "USD",
  });
  const [snapshotForm, setSnapshotForm] = useState({
    accountId: demoFallback(sampleAccounts[0]?.id ?? "", ""),
    asOfDate: new Date().toISOString().slice(0, 10),
    balance: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceState>(() => fallbackDataSource());
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccounts() {
      try {
        const [accountsResponse, snapshotsResponse, transactionsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/balance-snapshots", { headers: { Accept: "application/json" } }),
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
        ]);

        if (!accountsResponse.ok || !snapshotsResponse.ok || !transactionsResponse.ok) {
          throw new Error("Account API unavailable");
        }

        const [accountPayload, snapshotPayload, transactionPayload] = (await Promise.all([
          accountsResponse.json(),
          snapshotsResponse.json(),
          transactionsResponse.json(),
        ])) as [
          { accounts: DatabaseAccount[] },
          { snapshots: DatabaseSnapshot[] },
          { transactions: TransactionRow[] },
        ];
        const nextSnapshots = snapshotPayload.snapshots;
        const nextAccounts = accountPayload.accounts.map((account) => toAccountRow(account, nextSnapshots));

        if (isMounted && !hasLocalEdits.current) {
          setAccounts(nextAccounts);
          setSnapshots(nextSnapshots);
          setTransactions(transactionPayload.transactions);
          setSelectedAccountId((current) => {
            if (nextAccounts.some((account) => account.id === current)) {
              return current;
            }

            const requestedAccount = nextAccounts.find((account) => account.name === initialAccount);
            return requestedAccount?.id ?? nextAccounts[0]?.id ?? "";
          });
          setSnapshotForm((current) => ({ ...current, accountId: nextAccounts[0]?.id ?? current.accountId }));
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setAccounts(demoFallback(sampleAccounts, []));
          setTransactions(demoFallback(sampleTransactionRows, []));
          setDataSource(fallbackDataSource());
        }
      }
    }

    void loadAccounts();

    return () => {
      isMounted = false;
    };
  }, [initialAccount]);

  const accountOptions = useMemo(() => accounts.filter((account) => account.status !== "closed"), [accounts]);

  const recentSnapshots = useMemo(() => {
    return [...snapshots]
      .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6);
  }, [snapshots]);

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

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null,
    [accounts, selectedAccountId],
  );

  const accountDetail = useMemo(() => {
    if (!selectedAccount) {
      return null;
    }

    const accountTransactions = transactions.filter((transaction) => transaction.account === selectedAccount.name);
    const accountSnapshots = snapshots
      .filter((snapshot) => snapshot.accountId === selectedAccount.id || snapshot.accountName === selectedAccount.name)
      .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const operatingTransactions = accountTransactions.filter(
      (transaction) => transaction.status !== "excluded" && transaction.transferStatus !== "transfer",
    );
    const inflow = operatingTransactions.reduce((total, transaction) => (transaction.amountMinor > 0 ? total + transaction.amountMinor : total), 0);
    const outflow = operatingTransactions.reduce(
      (total, transaction) => (transaction.amountMinor < 0 ? total + Math.abs(transaction.amountMinor) : total),
      0,
    );

    return {
      inflow,
      outflow,
      latestSnapshot: accountSnapshots[0] ?? null,
      snapshotCount: accountSnapshots.length,
      transactionCount: accountTransactions.length,
    };
  }, [selectedAccount, snapshots, transactions]);

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
      const nextAccount = toAccountRow(payload.account);
      setAccounts((current) => [nextAccount, ...current]);
      setSelectedAccountId(nextAccount.id);
      setSnapshotForm((current) => ({ ...current, accountId: payload.account.id }));
      setDataSource("database");
      setFormState({ name: "", institution: "", mask: "", type: "checking", assetClass: "asset", currency: "USD" });
      setError(null);
    } catch {
      if (!canUseLocalFallback(dataSource)) {
        setError(productionFallbackMessage("Account save"));
        return;
      }

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
      setSelectedAccountId(nextAccount.id);
      setSnapshotForm((current) => ({ ...current, accountId: nextAccount.id }));
      setDataSource(fallbackDataSource());
      setFormState({ name: "", institution: "", mask: "", type: "checking", assetClass: "asset", currency: "USD" });
      setError(demoFallback("Saved in local demo mode. Configure Clerk and DATABASE_URL to persist accounts.", productionFallbackMessage("Account save")));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateAccountLifecycle(id: string, action: "close" | "reopen") {
    hasLocalEdits.current = true;
    const previousAccounts = accounts;
    setAccounts((current) => current.map((account) => (account.id === id ? { ...account, status: action === "close" ? "closed" : "active", lastActivity: action === "close" ? "Closed today" : "Reopened today" } : account)));

    if (dataSource === "database") {
      try {
        await fetch("/api/accounts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id, action }),
        });
        setError(null);
      } catch {
        if (!canUseLocalFallback(dataSource)) {
          setAccounts(previousAccounts);
          setError(productionFallbackMessage("Account lifecycle update"));
          return;
        }

        setError("Account lifecycle update stayed local because the API was unavailable.");
      }
    }
  }

  async function handleSnapshotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createBalanceSnapshotSchema.safeParse(snapshotForm);

    if (!parsed.success) {
      setError("Use an account, ISO date, and valid balance amount.");
      return;
    }

    const account = accounts.find((candidate) => candidate.id === parsed.data.accountId);

    if (!account) {
      setError("Choose an account before saving a balance snapshot.");
      return;
    }

    setIsSavingSnapshot(true);
    hasLocalEdits.current = true;

    try {
      const response = await fetch("/api/balance-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(snapshotForm),
      });

      if (!response.ok) {
        throw new Error("Balance snapshot API unavailable");
      }

      const payload = (await response.json()) as { snapshot: DatabaseSnapshot };
      upsertSnapshot(payload.snapshot);
      setDataSource("database");
      setSnapshotForm((current) => ({ ...current, balance: "" }));
      setError(null);
    } catch {
      if (!canUseLocalFallback(dataSource)) {
        setError(productionFallbackMessage("Balance snapshot save"));
        return;
      }

      const snapshot: DatabaseSnapshot = {
        id: `local_snapshot_${account.id}_${parsed.data.asOfDate}`,
        ledgerId: "local",
        accountId: account.id,
        accountName: account.name,
        asOfDate: parsed.data.asOfDate,
        balanceMinor: parsed.data.balance,
        currency: account.currency,
        source: "manual",
        createdAt: `${parsed.data.asOfDate}T00:00:00.000Z`,
      };

      upsertSnapshot(snapshot);
      setDataSource(fallbackDataSource());
      setSnapshotForm((current) => ({ ...current, balance: "" }));
      setError(demoFallback("Saved in local demo mode. Configure Clerk and DATABASE_URL to persist balance snapshots.", productionFallbackMessage("Balance snapshot save")));
    } finally {
      setIsSavingSnapshot(false);
    }
  }

  function upsertSnapshot(snapshot: DatabaseSnapshot) {
    setSnapshots((current) => [snapshot, ...current.filter((item) => !(item.accountId === snapshot.accountId && item.asOfDate === snapshot.asOfDate))]);
    setAccounts((current) =>
      current.map((account) =>
        account.id === snapshot.accountId
          ? {
              ...account,
              balanceMinor: snapshot.balanceMinor,
              lastActivity: `Snapshot ${snapshot.asOfDate}`,
            }
          : account,
      ),
    );
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
            <span className={dataSourceStatusClass(dataSource)}>{dataSourceLabel(dataSource)}</span>
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
                <span className={account.assetClass === "asset" ? "amount-positive" : "amount-negative"}>
                  {account.assetClass}
                  {account.status === "closed" ? " / closed" : ""}
                </span>
                <div className="account-row-actions">
                  <strong className={account.balanceMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(account.balanceMinor)}</strong>
                  <button type="button" aria-label={`View ${account.name} detail`} onClick={() => setSelectedAccountId(account.id)}>
                    <BarChart3 size={15} />
                  </button>
                  {account.status === "closed" ? (
                    <button type="button" aria-label={`Reopen ${account.name}`} onClick={() => updateAccountLifecycle(account.id, "reopen")}>
                      <CheckCircle2 size={15} />
                    </button>
                  ) : (
                    <button type="button" aria-label={`Close ${account.name}`} onClick={() => updateAccountLifecycle(account.id, "close")}>
                      <CircleSlash size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedAccount && accountDetail ? (
          <section className="panel account-detail-panel" aria-label="Account detail reporting">
            <div className="panel-header accounts-toolbar">
              <div>
                <p className="panel-label">Account detail</p>
                <h2 className="panel-title">{selectedAccount.name}</h2>
              </div>
              <a className="secondary-action" href={`/transactions?account=${encodeURIComponent(selectedAccount.name)}`}>
                <BarChart3 size={16} />
                View register
              </a>
            </div>
            <div className="account-detail-grid">
              <AccountDetailFact label="Current position" value={formatMoney(selectedAccount.balanceMinor, selectedAccount.currency)} />
              <AccountDetailFact
                href={`/transactions?account=${encodeURIComponent(selectedAccount.name)}&direction=inflow`}
                label="Operating inflow"
                value={formatMoney(accountDetail.inflow, selectedAccount.currency)}
              />
              <AccountDetailFact
                href={`/transactions?account=${encodeURIComponent(selectedAccount.name)}&direction=outflow`}
                label="Operating outflow"
                value={formatMoney(-accountDetail.outflow, selectedAccount.currency)}
              />
              <AccountDetailFact
                href={`/transactions?account=${encodeURIComponent(selectedAccount.name)}`}
                label="Transactions"
                value={`${accountDetail.transactionCount} rows`}
              />
              <AccountDetailFact label="Snapshots" value={`${accountDetail.snapshotCount} records`} />
              <AccountDetailFact label="Latest evidence" value={accountDetail.latestSnapshot?.asOfDate ?? "No snapshot"} />
            </div>
          </section>
        ) : null}
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
          <div className="panel-header">
            <div>
              <p className="panel-label">Balance snapshot</p>
              <h2 className="panel-title">Manual position</h2>
            </div>
            <div className="summary-icon">
              <CalendarDays size={17} />
            </div>
          </div>

          <form className="account-form" onSubmit={handleSnapshotSubmit}>
            <label>
              <span>Account</span>
              <select
                required
                value={snapshotForm.accountId}
                onChange={(event) => setSnapshotForm((current) => ({ ...current, accountId: event.target.value }))}
              >
                {accountOptions.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>As of date</span>
              <input
                required
                type="date"
                value={snapshotForm.asOfDate}
                onChange={(event) => setSnapshotForm((current) => ({ ...current, asOfDate: event.target.value }))}
              />
            </label>
            <label>
              <span>Balance</span>
              <input
                required
                inputMode="decimal"
                value={snapshotForm.balance}
                onChange={(event) => setSnapshotForm((current) => ({ ...current, balance: event.target.value }))}
                placeholder="1250.42"
              />
            </label>
            <button className="primary-action" type="submit" disabled={accountOptions.length === 0}>
              <Save size={16} />
              {isSavingSnapshot ? "Saving" : "Save snapshot"}
            </button>
          </form>
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
    lastActivity: latestSnapshot ? `Snapshot ${latestSnapshot.asOfDate}` : account.updatedAt ? "Updated" : "No activity",
    status: account.closedOn || !account.isActive ? "closed" : account.isHidden ? "hidden" : "active",
  };
}

function getInitialAccountId(initialAccount: string) {
  return demoFallback(sampleAccounts.find((account) => account.name === initialAccount)?.id ?? sampleAccounts[0]?.id ?? "", "");
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

function AccountDetailFact({ href, label, value }: { href?: string; label: string; value: string }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  return href ? (
    <a className="account-detail-fact report-drilldown" href={href}>
      {content}
    </a>
  ) : (
    <div className="account-detail-fact">{content}</div>
  );
}

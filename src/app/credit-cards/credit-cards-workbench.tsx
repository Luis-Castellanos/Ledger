"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Search, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/finance/money";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, type DataSourceState } from "@/lib/demo-fallback";

type AccountRow = {
  id: string;
  name: string;
  institution: string | null;
  mask: string | null;
  type: string;
  assetClass: string;
  isActive: boolean;
  openedOn: string | null;
};

const demoCards: AccountRow[] = sampleAccounts
  .filter((account) => account.type.includes("credit") || account.assetClass === "liability")
  .map((account) => ({
    id: account.id,
    name: account.name,
    institution: account.institution,
    mask: account.mask,
    type: account.type,
    assetClass: account.assetClass,
    isActive: true,
    openedOn: null,
  }));

export function CreditCardsWorkbench() {
  const [accounts, setAccounts] = useState<AccountRow[]>(() => demoFallback(demoCards, []));
  const [transactions, setTransactions] = useState<TransactionRow[]>(() => demoFallback(sampleTransactionRows, []));
  const [query, setQuery] = useState("");
  const [dataSource, setDataSource] = useState<DataSourceState>(() => fallbackDataSource());

  useEffect(() => {
    let mounted = true;

    async function loadCards() {
      try {
        const [accountsResponse, transactionsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
        ]);
        if (!accountsResponse.ok || !transactionsResponse.ok) {
          throw new Error("Credit card APIs unavailable");
        }
        const accountsPayload = (await accountsResponse.json()) as { accounts: AccountRow[] };
        const transactionsPayload = (await transactionsResponse.json()) as { transactions: TransactionRow[] };
        if (mounted) {
          const creditAccounts = accountsPayload.accounts.filter((account) => account.type.includes("credit") || account.assetClass === "liability");
          setAccounts(creditAccounts.length ? creditAccounts : demoFallback(demoCards, []));
          setTransactions(transactionsPayload.transactions);
          setDataSource("database");
        }
      } catch {
        if (mounted) {
          setAccounts(demoFallback(demoCards, []));
          setTransactions(demoFallback(sampleTransactionRows, []));
          setDataSource(fallbackDataSource());
        }
      }
    }

    void loadCards();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return accounts
      .map((account) => {
        const cardTransactions = transactions.filter((transaction) => transaction.account === account.name);
        const balanceMinor = cardTransactions.reduce((total, transaction) => total + transaction.amountMinor, 0);
        const spendMinor = cardTransactions.reduce((total, transaction) => (transaction.amountMinor < 0 ? total + Math.abs(transaction.amountMinor) : total), 0);
        const paymentsMinor = cardTransactions.reduce((total, transaction) => (transaction.amountMinor > 0 ? total + transaction.amountMinor : total), 0);
        return { ...account, balanceMinor, spendMinor, paymentsMinor, transactionCount: cardTransactions.length };
      })
      .filter((card) => !normalized || [card.name, card.institution, card.mask, card.type].some((value) => value?.toLowerCase().includes(normalized)));
  }, [accounts, query, transactions]);

  const totals = useMemo(
    () =>
      cards.reduce(
        (summary, card) => {
          summary.balanceMinor += card.balanceMinor;
          summary.spendMinor += card.spendMinor;
          summary.paymentsMinor += card.paymentsMinor;
          return summary;
        },
        { balanceMinor: 0, spendMinor: 0, paymentsMinor: 0 },
      ),
    [cards],
  );

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <CardMetric label="Cards" value={String(cards.length)} icon={<CreditCard size={17} />} />
          <CardMetric label="Current balance" value={formatMoney(totals.balanceMinor)} icon={<TrendingUp size={17} />} />
          <CardMetric label="Card spend" value={formatMoney(-totals.spendMinor)} icon={<CreditCard size={17} />} />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Credit cards</p>
              <h2 className="panel-title">Card register</h2>
            </div>
            <span className={dataSourceStatusClass(dataSource)}>{dataSourceLabel(dataSource)}</span>
            <div className="transaction-controls">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search credit cards" placeholder="Search cards" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </div>
          <div className="credit-card-grid">
            {cards.map((card) => (
              <article className="credit-card-panel" key={card.id}>
                <div className="credit-card-art">
                  <span>{card.institution ?? "Card"}</span>
                  <strong>{card.mask ? `**** ${card.mask}` : "****"}</strong>
                </div>
                <div className="credit-card-body">
                  <p className="panel-label">{card.type}</p>
                  <h3>{card.name}</h3>
                  <div className="credit-card-facts">
                    <span>Balance <strong>{formatMoney(card.balanceMinor)}</strong></span>
                    <span>Spend <strong>{formatMoney(-card.spendMinor)}</strong></span>
                    <span>Payments <strong>{formatMoney(card.paymentsMinor)}</strong></span>
                    <span>Rows <strong>{card.transactionCount}</strong></span>
                  </div>
                </div>
              </article>
            ))}
            {!cards.length ? <div className="transaction-empty-state">No credit card accounts found.</div> : null}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <p className="panel-label">Portfolio</p>
          <div className="file-evidence-list">
            <div className="file-evidence-item">
              <span>Active cards</span>
              <strong>{cards.filter((card) => card.isActive).length}</strong>
            </div>
            <div className="file-evidence-item">
              <span>Total payments</span>
              <strong>{formatMoney(totals.paymentsMinor)}</strong>
            </div>
            <div className="file-evidence-item">
              <span>Transactions</span>
              <strong>{cards.reduce((total, card) => total + card.transactionCount, 0)}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function CardMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="stat-panel account-metric">
      <div className="account-metric-icon account-metric-green">{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

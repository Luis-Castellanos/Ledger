"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Landmark, Search } from "lucide-react";
import { formatMoney } from "@/lib/finance/money";
import { sampleTransactionRows, type TransactionRow } from "@/lib/finance/transaction-sample-data";
import { dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, type DataSourceState } from "@/lib/demo-fallback";

type DocumentRow = {
  id: string;
  fileName: string;
  detectedType: string;
  detectedIssuer: string | null;
  statementPeriod: string | null;
  status: string;
  uploadedAt: string;
};

const demoPayrollDocs: DocumentRow[] = [
  {
    id: "demo_paystub",
    fileName: "Paystub_2026-05-15.pdf",
    detectedType: "paystub",
    detectedIssuer: "Employer",
    statementPeriod: "05/01/2026 - 05/15/2026",
    status: "deferred",
    uploadedAt: "2026-05-29T08:00:00.000Z",
  },
];

export function PayrollWorkbench() {
  const [transactions, setTransactions] = useState<TransactionRow[]>(() => demoFallback(sampleTransactionRows, []));
  const [documents, setDocuments] = useState<DocumentRow[]>(() => demoFallback(demoPayrollDocs, []));
  const [query, setQuery] = useState("");
  const [dataSource, setDataSource] = useState<DataSourceState>(() => fallbackDataSource());

  useEffect(() => {
    let mounted = true;

    async function loadPayroll() {
      try {
        const [transactionsResponse, documentsResponse] = await Promise.all([
          fetch("/api/transactions", { headers: { Accept: "application/json" } }),
          fetch("/api/documents", { headers: { Accept: "application/json" } }),
        ]);

        if (!transactionsResponse.ok || !documentsResponse.ok) {
          throw new Error("Payroll APIs unavailable");
        }

        const transactionsPayload = (await transactionsResponse.json()) as { transactions: TransactionRow[] };
        const documentsPayload = (await documentsResponse.json()) as { documents: DocumentRow[] };
        if (mounted) {
          setTransactions(transactionsPayload.transactions);
          const paystubs = documentsPayload.documents.filter((document) => document.detectedType === "paystub");
          setDocuments(paystubs.length ? paystubs : demoFallback(demoPayrollDocs, []));
          setDataSource("database");
        }
      } catch {
        if (mounted) {
          setTransactions(demoFallback(sampleTransactionRows, []));
          setDocuments(demoFallback(demoPayrollDocs, []));
          setDataSource(fallbackDataSource());
        }
      }
    }

    void loadPayroll();

    return () => {
      mounted = false;
    };
  }, []);

  const payrollTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const isPayroll =
        transaction.amountMinor > 0 &&
        [transaction.category, transaction.merchant, ...(transaction.tags ?? [])].some((value) => value.toLowerCase().includes("payroll") || value.toLowerCase().includes("income"));
      const matchesQuery = !normalized || [transaction.merchant, transaction.account, transaction.category, transaction.date].some((value) => value.toLowerCase().includes(normalized));
      return isPayroll && matchesQuery;
    });
  }, [query, transactions]);

  const totals = useMemo(
    () =>
      payrollTransactions.reduce(
        (summary, transaction) => {
          summary.netPayMinor += transaction.amountMinor;
          summary.count += 1;
          return summary;
        },
        { netPayMinor: 0, count: 0 },
      ),
    [payrollTransactions],
  );

  return (
    <div className="transactions-grid fidelity-register-grid">
      <section className="transactions-main fidelity-register-main">
        <div className="fidelity-summary-strip fidelity-summary-strip-three">
          <PayrollMetric label="Net pay" value={formatMoney(totals.netPayMinor)} icon={<Landmark size={17} />} />
          <PayrollMetric label="Deposits" value={String(totals.count)} icon={<Landmark size={17} />} />
          <PayrollMetric label="Paystubs" value={String(documents.length)} icon={<FileText size={17} />} />
        </div>

        <section className="panel transactions-table-panel fidelity-register-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Payroll</p>
              <h2 className="panel-title">Deposit register</h2>
            </div>
            <span className={dataSourceStatusClass(dataSource)}>{dataSourceLabel(dataSource)}</span>
            <div className="transaction-controls">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search payroll" placeholder="Search payroll" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </div>
          <div className="transactions-table payroll-register-table" role="table" aria-label="Payroll deposits">
            <div className="transactions-table-head" role="row">
              <span>Payor</span>
              <span>Account</span>
              <span>Category</span>
              <span>Date</span>
              <span>Amount</span>
            </div>
            {payrollTransactions.map((transaction) => (
              <div className="transactions-table-row" role="row" key={transaction.id}>
                <div className="transaction-register-name">
                  <p>{transaction.merchant}</p>
                  <span>{(transaction.tags ?? []).join(", ") || "Payroll"}</span>
                </div>
                <span className="text-[13px] text-[var(--ink)]">{transaction.account}</span>
                <span className="account-pill">{transaction.category}</span>
                <span className="text-[12px] text-[var(--muted)]">{transaction.date}</span>
                <strong className="amount-positive">{formatMoney(transaction.amountMinor)}</strong>
              </div>
            ))}
            {!payrollTransactions.length ? <div className="transaction-empty-state">No payroll deposits found.</div> : null}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <p className="panel-label">Paystubs</p>
          <div className="file-evidence-list">
            {documents.map((document) => (
              <div className="file-evidence-item" key={document.id}>
                <span>{document.fileName}</span>
                <strong>{labelize(document.status)}</strong>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function PayrollMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="stat-panel account-metric">
      <div className="account-metric-icon account-metric-green">{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

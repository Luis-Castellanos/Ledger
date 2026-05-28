"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, ListChecks, Search, ShieldAlert, Upload } from "lucide-react";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { sampleImportBatches, sampleImportRows, type ImportBatch, type ImportPreviewRow, type ImportRowStatus } from "@/lib/finance/import-sample-data";
import { formatMoney } from "@/lib/finance/money";

const categories = ["Uncategorized", ...defaultCategoryTree.flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)])];
const statuses = [
  { label: "Accepted", value: "accepted" },
  { label: "Needs review", value: "needs_review" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Rejected", value: "rejected" },
] satisfies { label: string; value: ImportRowStatus }[];

export function ImportsWorkbench() {
  const [rows, setRows] = useState<ImportPreviewRow[]>(sampleImportRows);
  const [batches, setBatches] = useState<ImportBatch[]>(sampleImportBatches);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>(sampleAccounts.map((account) => ({ id: account.name, name: account.name })));
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(sampleAccounts[0]?.name ?? "");
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadImports() {
      try {
        const [accountsResponse, importsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch("/api/imports", { headers: { Accept: "application/json" } }),
        ]);

        if (!accountsResponse.ok || !importsResponse.ok) {
          throw new Error("Import APIs unavailable");
        }

        const accountsPayload = (await accountsResponse.json()) as { accounts: DatabaseAccount[] };
        const importsPayload = (await importsResponse.json()) as { batches: ImportBatch[]; rows: ImportPreviewRow[] };
        const nextAccounts = accountsPayload.accounts.map((account) => ({ id: account.id, name: account.name }));

        if (isMounted && !hasLocalEdits.current) {
          setAccountOptions(nextAccounts.length > 0 ? nextAccounts : sampleAccounts.map((account) => ({ id: account.name, name: account.name })));
          setSelectedAccountId(nextAccounts[0]?.id ?? selectedAccountId);
          setBatches(importsPayload.batches);
          setRows(importsPayload.rows);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setDataSource("demo");
        }
      }
    }

    void loadImports();

    return () => {
      isMounted = false;
    };
  }, [selectedAccountId]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { accepted: 0, duplicate: 0, needs_review: 0, rejected: 0 } satisfies Record<ImportRowStatus, number>,
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => [row.description, row.category, row.date, String(row.rowNumber)].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [query, rows]);

  async function updateRow(id: string, patch: Partial<ImportPreviewRow>) {
    hasLocalEdits.current = true;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

    if (dataSource === "database") {
      try {
        await fetch("/api/imports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id, category: patch.category, status: patch.status }),
        });
      } catch {
        setError("Import row update stayed local because the API was unavailable.");
      }
    }
  }

  async function stageMockFile() {
    const nextNumber = Math.max(...rows.map((row) => row.rowNumber)) + 1;
    const nextRow = {
      id: `local_${Date.now()}`,
      rowNumber: nextNumber,
      date: new Date().toISOString().slice(0, 10),
      description: "NEW CSV ROW",
      category: "Uncategorized",
      amountMinor: -4218,
      status: "needs_review" as ImportRowStatus,
    };
    hasLocalEdits.current = true;

    if (dataSource === "database") {
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          filename: `manual-stage-${Date.now()}.csv`,
          rows: [
            {
              rowNumber: nextRow.rowNumber,
              date: nextRow.date,
              description: nextRow.description,
              amount: "-42.18",
              category: nextRow.category,
              status: nextRow.status,
            },
          ],
        }),
      });

      if (response.ok) {
        setRows([nextRow]);
        setBatches((current) => [
          {
            id: `local_batch_${Date.now()}`,
            filename: "manual-stage.csv",
            account: accountOptions.find((account) => account.id === selectedAccountId)?.name ?? "Selected account",
            status: "staged",
            uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
            acceptedRows: 0,
            rejectedRows: 0,
          },
          ...current,
        ]);
        setError(null);
        return;
      }
    }

    setRows((current) => [nextRow, ...current]);
    setBatches((current) => [
      {
        id: `local_batch_${Date.now()}`,
        filename: "manual-stage.csv",
        account: accountOptions.find((account) => account.id === selectedAccountId)?.name ?? "Selected account",
        status: "staged",
        uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        acceptedRows: 0,
        rejectedRows: 0,
      },
      ...current,
    ]);
    setDataSource("demo");
    setError(dataSource === "database" ? "Import stayed local because the API rejected the staged rows." : null);
  }

  const selectedAccountName = accountOptions.find((account) => account.id === selectedAccountId)?.name ?? selectedAccountId;

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-4">
          <ImportMetric label="Accepted" value={`${summary.accepted}`} icon={<CheckCircle2 size={17} />} tone="green" />
          <ImportMetric label="Review" value={`${summary.needs_review}`} icon={<ListChecks size={17} />} tone="violet" />
          <ImportMetric label="Duplicates" value={`${summary.duplicate}`} icon={<FileSpreadsheet size={17} />} tone="gold" />
          <ImportMetric label="Rejected" value={`${summary.rejected}`} icon={<ShieldAlert size={17} />} tone="coral" />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Staging</p>
              <h2 className="panel-title">Import review</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
            <div className="transaction-controls">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search import rows" placeholder="Search rows" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <select aria-label="Import account" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
                {accountOptions.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="transactions-table" role="table" aria-label="Import rows">
            <div className="transactions-table-head" role="row">
              <span>Description</span>
              <span>Category</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {filteredRows.map((row) => (
              <div className="transactions-table-row" role="row" key={row.id}>
                <div className="transaction-register-name">
                  <p>{row.description || "Missing description"}</p>
                  <span>
                    #{row.rowNumber} • {row.date}
                  </span>
                </div>
                <select aria-label={`Category for row ${row.rowNumber}`} value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value })}>
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select aria-label={`Status for row ${row.rowNumber}`} value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value as ImportRowStatus })}>
                  {statuses.map((status) => (
                    <option value={status.value} key={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <strong className={row.amountMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(row.amountMinor)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">CSV intake</p>
              <h2 className="panel-title">Stage file</h2>
            </div>
            <div className="summary-icon">
              <Upload size={17} />
            </div>
          </div>
          <div className="mt-6 grid gap-3 rounded-[8px] border border-dashed border-[rgba(214,226,217,0.22)] p-5 text-[var(--muted)]">
            <FileSpreadsheet size={26} />
            <p className="m-0 font-bold text-[var(--ink-strong)]">CSV staging area</p>
            <span className="font-mono text-[11px]">{selectedAccountName}</span>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-action" type="button" onClick={stageMockFile}>
              <Upload size={16} />
              Add sample row
            </button>
          </div>
        </section>

        <section className="panel account-form-panel">
          <p className="panel-label">Recent files</p>
          <div className="mt-5 grid gap-3">
            {batches.map((batch) => (
              <div className="border-b border-[rgba(214,226,217,0.08)] pb-3 last:border-b-0 last:pb-0" key={batch.id}>
                <strong className="block text-[13px] text-[var(--ink-strong)]">{batch.filename}</strong>
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {batch.account} • {batch.uploadedAt}
                </span>
                <p className="m-0 mt-1 font-mono text-[11px] text-[var(--muted)]">
                  {batch.acceptedRows} accepted / {batch.rejectedRows} rejected
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

type DatabaseAccount = {
  id: string;
  name: string;
};

type AccountOption = {
  id: string;
  name: string;
};

function ImportMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" | "gold" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

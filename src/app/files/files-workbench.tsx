"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Search, Trash2 } from "lucide-react";
import { documentStatuses, documentTypes, labelizeDocumentValue } from "@/lib/finance/document";

type DocumentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  detectedType: string;
  detectedIssuer: string | null;
  statementPeriod: string | null;
  status: string;
  transactionCount: number;
  parseError: string | null;
  uploadedAt: string;
  accountId: string | null;
  accountName: string | null;
  accountInstitution: string | null;
  accountMask: string | null;
  accountType: string | null;
};

type AccountOption = {
  id: string;
  name: string;
};

const sampleDocuments: DocumentRow[] = [
  {
    id: "demo_fidelity_statement",
    fileName: "Fidelity_Brokerage_2026-05.pdf",
    mimeType: "application/pdf",
    byteSize: 428_000,
    detectedType: "investment",
    detectedIssuer: "fidelity",
    statementPeriod: "05/01/2026 - 05/31/2026",
    status: "uploaded",
    transactionCount: 0,
    parseError: null,
    uploadedAt: "2026-05-29T08:42:00.000Z",
    accountId: null,
    accountName: null,
    accountInstitution: "Fidelity",
    accountMask: null,
    accountType: "investment",
  },
  {
    id: "demo_card_statement",
    fileName: "Chase_Credit_Card_2026-04.pdf",
    mimeType: "application/pdf",
    byteSize: 312_000,
    detectedType: "credit_card",
    detectedIssuer: "chase",
    statementPeriod: "04/02/2026 - 05/01/2026",
    status: "deferred",
    transactionCount: 0,
    parseError: "Parser not implemented for this document type yet.",
    uploadedAt: "2026-05-28T18:14:00.000Z",
    accountId: null,
    accountName: null,
    accountInstitution: "Chase",
    accountMask: null,
    accountType: "credit_card",
  },
];

export function FilesWorkbench() {
  const [documents, setDocuments] = useState<DocumentRow[]>(sampleDocuments);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDocuments() {
      try {
        const [documentsResponse, accountsResponse] = await Promise.all([
          fetch("/api/documents", { headers: { Accept: "application/json" } }),
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
        ]);

        if (!documentsResponse.ok || !accountsResponse.ok) {
          throw new Error("Files API unavailable");
        }

        const documentsPayload = (await documentsResponse.json()) as { documents: DocumentRow[] };
        const accountsPayload = (await accountsResponse.json()) as { accounts: AccountOption[] };
        if (mounted) {
          setDocuments(documentsPayload.documents.length ? documentsPayload.documents : sampleDocuments);
          setAccounts(accountsPayload.accounts);
          setDataSource("database");
        }
      } catch {
        if (mounted) {
          setDataSource("demo");
        }
      }
    }

    void loadDocuments();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesQuery =
        !normalized ||
        [document.fileName, document.detectedIssuer, document.statementPeriod, document.accountName, document.accountInstitution, document.detectedType].some(
          (value) => value?.toLowerCase().includes(normalized),
        );
      const matchesStatus = status === "all" || document.status === status;
      const matchesType = type === "all" || document.detectedType === type;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [documents, query, status, type]);

  const metrics = useMemo(
    () => ({
      total: documents.length,
      parsed: documents.filter((document) => document.status === "parsed").length,
      deferred: documents.filter((document) => document.status === "deferred").length,
    }),
    [documents],
  );

  async function updateDocument(id: string, patch: Partial<Pick<DocumentRow, "accountId" | "detectedType" | "statementPeriod" | "detectedIssuer" | "status">>) {
    setDocuments((current) => current.map((document) => (document.id === id ? { ...document, ...patch } : document)));
    if (dataSource !== "database") {
      return;
    }

    try {
      const response = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!response.ok) {
        throw new Error("Document update failed");
      }
      setMessage(null);
    } catch {
      setMessage("File update stayed local because the API was unavailable.");
    }
  }

  async function deleteDocument(id: string) {
    const previous = documents;
    setDocuments((current) => current.filter((document) => document.id !== id));
    if (dataSource !== "database") {
      return;
    }

    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error("Document delete failed");
      }
      setMessage(null);
    } catch {
      setDocuments(previous);
      setMessage("File delete failed.");
    }
  }

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <FileMetric label="Files" value={String(metrics.total)} />
          <FileMetric label="Parsed" value={String(metrics.parsed)} />
          <FileMetric label="Deferred" value={String(metrics.deferred)} />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Files</p>
              <h2 className="panel-title">Document register</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
            <div className="transaction-controls">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search files" placeholder="Search files" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <select aria-label="File status filter" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                {documentStatuses.map((option) => (
                  <option value={option} key={option}>
                    {labelizeDocumentValue(option)}
                  </option>
                ))}
              </select>
              <select aria-label="File type filter" value={type} onChange={(event) => setType(event.target.value)}>
                <option value="all">All types</option>
                {documentTypes.map((option) => (
                  <option value={option} key={option}>
                    {labelizeDocumentValue(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {message ? <p className="form-error">{message}</p> : null}
          <div className="transactions-table files-register-table" role="table" aria-label="Files">
            <div className="transactions-table-head" role="row">
              <span>File</span>
              <span>Type</span>
              <span>Account</span>
              <span>Period</span>
              <span>Status</span>
              <span>Uploaded</span>
              <span />
            </div>
            {visibleDocuments.map((document) => (
              <div className="transactions-table-row" role="row" key={document.id}>
                <div className="transaction-register-name">
                  <p>{document.fileName}</p>
                  <span>{fmtBytes(document.byteSize)} / {document.detectedIssuer ?? "Unknown issuer"}</span>
                </div>
                <select aria-label={`Document type for ${document.fileName}`} value={document.detectedType} onChange={(event) => void updateDocument(document.id, { detectedType: event.target.value })}>
                  {documentTypes.map((option) => (
                    <option value={option} key={option}>
                      {labelizeDocumentValue(option)}
                    </option>
                  ))}
                </select>
                <select aria-label={`Account for ${document.fileName}`} value={document.accountId ?? ""} onChange={(event) => void updateDocument(document.id, { accountId: event.target.value || null })}>
                  <option value="">Unassigned</option>
                  {accounts.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Statement period for ${document.fileName}`}
                  className="table-inline-input"
                  defaultValue={document.statementPeriod ?? ""}
                  onBlur={(event) => void updateDocument(document.id, { statementPeriod: event.target.value || null })}
                  placeholder="MM/DD/YYYY - MM/DD/YYYY"
                />
                <select aria-label={`Status for ${document.fileName}`} value={document.status} onChange={(event) => void updateDocument(document.id, { status: event.target.value })}>
                  {documentStatuses.map((option) => (
                    <option value={option} key={option}>
                      {labelizeDocumentValue(option)}
                    </option>
                  ))}
                </select>
                <span className="text-[12px] text-[var(--muted)]">{formatDate(document.uploadedAt)}</span>
                <button className="table-icon-button" type="button" aria-label={`Delete ${document.fileName}`} onClick={() => void deleteDocument(document.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!visibleDocuments.length ? <div className="transaction-empty-state">No files match the current filters.</div> : null}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Coverage</p>
              <h2 className="panel-title">Source evidence</h2>
            </div>
          </div>
          <div className="file-evidence-list">
            {documentTypes.slice(0, 6).map((option) => (
              <div className="file-evidence-item" key={option}>
                <span>{labelizeDocumentValue(option)}</span>
                <strong>{documents.filter((document) => document.detectedType === option).length}</strong>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function FileMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-panel account-metric">
      <div className="account-metric-icon account-metric-green">
        <FileText size={17} />
      </div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

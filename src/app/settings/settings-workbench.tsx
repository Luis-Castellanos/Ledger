"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Archive, Download, KeyRound, Save, ScrollText } from "lucide-react";
import { updateLedgerSettingsSchema } from "@/lib/finance/settings";

type SettingsState = {
  user: {
    email: string;
    displayName: string | null;
  };
  ledger: {
    name: string;
    defaultCurrency: string;
  };
};

type ExportJobSummary = {
  id: string;
  status: string;
  format: string;
  includeAuditEvents: boolean;
  artifactUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type AuditEventSummary = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string | null;
  createdAt: string;
};

const fallbackSettings: SettingsState = {
  user: {
    email: "local-demo@vault.local",
    displayName: "Local Demo",
  },
  ledger: {
    name: "Personal ledger",
    defaultCurrency: "USD",
  },
};

const fallbackExportJobs: ExportJobSummary[] = [
  {
    id: "demo-export-transactions",
    status: "succeeded",
    format: "transactions_csv",
    includeAuditEvents: true,
    artifactUrl: "vault-transactions_csv-demo.csv",
    errorMessage: null,
    createdAt: "2026-05-27T14:30:00.000Z",
    completedAt: "2026-05-27T14:30:01.000Z",
  },
  {
    id: "demo-export-backup",
    status: "succeeded",
    format: "backup_package",
    includeAuditEvents: true,
    artifactUrl: "vault-backup_package-demo.json",
    errorMessage: null,
    createdAt: "2026-05-26T18:15:00.000Z",
    completedAt: "2026-05-26T18:15:02.000Z",
  },
];

const fallbackAuditEvents: AuditEventSummary[] = [
  {
    id: "demo-audit-import",
    action: "import.committed",
    entityType: "import",
    entityId: "demo-import",
    actorEmail: "local-demo@vault.local",
    createdAt: "2026-05-27T16:05:00.000Z",
  },
  {
    id: "demo-audit-export",
    action: "export.created",
    entityType: "export_job",
    entityId: "demo-export",
    actorEmail: "local-demo@vault.local",
    createdAt: "2026-05-27T14:30:01.000Z",
  },
];

export function SettingsWorkbench() {
  const [settings, setSettings] = useState<SettingsState>(fallbackSettings);
  const [formState, setFormState] = useState(fallbackSettings.ledger);
  const [exportHistory, setExportHistory] = useState<ExportJobSummary[]>(fallbackExportJobs);
  const [auditTrail, setAuditTrail] = useState<AuditEventSummary[]>(fallbackAuditEvents);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasUserEditedSettings = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [meResponse, exportJobsResponse, auditEventsResponse] = await Promise.all([
          fetch("/api/me", { headers: { Accept: "application/json" } }),
          fetch("/api/export-jobs", { headers: { Accept: "application/json" } }),
          fetch("/api/audit-events", { headers: { Accept: "application/json" } }),
        ]);

        if (!meResponse.ok) {
          throw new Error("Settings API unavailable");
        }

        const payload = (await meResponse.json()) as SettingsState;
        const exportJobsPayload = exportJobsResponse.ok
          ? ((await exportJobsResponse.json()) as { exportJobs: ExportJobSummary[] })
          : { exportJobs: [] };
        const auditEventsPayload = auditEventsResponse.ok
          ? ((await auditEventsResponse.json()) as { auditEvents: AuditEventSummary[] })
          : { auditEvents: [] };

        if (isMounted) {
          if (!hasUserEditedSettings.current) {
            setSettings(payload);
            setFormState(payload.ledger);
          }
          setExportHistory(exportJobsPayload.exportJobs);
          setAuditTrail(auditEventsPayload.auditEvents);
        }
      } catch {
        if (isMounted) {
          if (!hasUserEditedSettings.current) {
            setSettings(fallbackSettings);
            setFormState(fallbackSettings.ledger);
          }
          setExportHistory(fallbackExportJobs);
          setAuditTrail(fallbackAuditEvents);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = updateLedgerSettingsSchema.safeParse(formState);

    if (!parsed.success) {
      setMessage("Ledger name and a three-letter currency code are required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Settings API unavailable");
      }

      const payload = (await response.json()) as { ledger: SettingsState["ledger"] };
      setSettings((current) => ({ ...current, ledger: payload.ledger }));
      setFormState(payload.ledger);
      setMessage("Settings saved.");
    } catch {
      setSettings((current) => ({ ...current, ledger: parsed.data }));
      setFormState(parsed.data);
      setMessage("Settings are saved for this session. Permanent saving is unavailable right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-grid">
      <section className="settings-main">
        <section className="panel settings-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Ledger</p>
              <h2 className="panel-title">Preferences</h2>
            </div>
          </div>

          <form className="account-form settings-form" onSubmit={handleSubmit}>
            <label>
              <span>Ledger name</span>
              <input
                required
                value={formState.name}
                onChange={(event) => {
                  hasUserEditedSettings.current = true;
                  setFormState((current) => ({ ...current, name: event.target.value }));
                }}
                placeholder="Personal ledger"
              />
            </label>
            <label>
              <span>Default currency</span>
              <input
                required
                maxLength={3}
                value={formState.defaultCurrency}
                onChange={(event) => {
                  hasUserEditedSettings.current = true;
                  setFormState((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }));
                }}
              />
            </label>
            {message ? <p className={message.startsWith("Settings saved") ? "form-success" : "form-error"}>{message}</p> : null}
            <button className="primary-action" type="submit">
              <Save size={16} />
              {isSaving ? "Saving" : "Save settings"}
            </button>
          </form>
        </section>

        <section className="panel settings-panel" aria-label="Export history">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Export history</p>
              <h2 className="panel-title">Backup and portability log</h2>
            </div>
            <div className="transaction-controls">
              <a className="secondary-action" href="/api/exports?format=transactions_csv">
                <Download size={16} />
                Transactions CSV
              </a>
              <a className="secondary-action" href="/api/exports?format=backup_package">
                <Archive size={16} />
                Backup package
              </a>
            </div>
          </div>

          <div className="export-history-list">
            {exportHistory.length > 0 ? (
              exportHistory.map((job) => (
                <article className="export-history-item" key={job.id}>
                  <div>
                    <span className={job.status === "succeeded" ? "status-chip status-chip-live" : "status-chip"}>{job.status}</span>
                    <strong>{formatExportFormat(job.format)}</strong>
                    <p>{formatExportTimestamp(job.createdAt)}</p>
                  </div>
                  <div>
                    <span>{job.includeAuditEvents ? "Audit included" : "Audit excluded"}</span>
                    <strong>{getExportJobDetail(job)}</strong>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No exports yet. Generate a backup package to create the first export job.</p>
            )}
          </div>
        </section>

        <section className="panel settings-panel" aria-label="Audit trail">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Audit trail</p>
              <h2 className="panel-title">Recent control events</h2>
            </div>
            <div className="summary-icon">
              <ScrollText size={17} />
            </div>
          </div>

          <div className="export-history-list">
            {auditTrail.length > 0 ? (
              auditTrail.map((event) => (
                <article className="export-history-item" key={event.id}>
                  <div>
                    <span className="status-chip status-chip-live">{formatAuditAction(event.action)}</span>
                    <strong>{event.entityType.replace("_", " ")}</strong>
                    <p>{formatExportTimestamp(event.createdAt)}</p>
                  </div>
                  <div>
                    <span>{event.actorEmail ?? "System"}</span>
                    <strong>{event.entityId ?? "No entity id"}</strong>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No audit events yet. Meaningful ledger changes will appear here.</p>
            )}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Account</p>
              <h2 className="panel-title">Current user</h2>
            </div>
            <div className="summary-icon">
              <KeyRound size={17} />
            </div>
          </div>
          <div className="settings-facts">
            <div>
              <span>Email</span>
              <strong>{settings.user.email}</strong>
            </div>
            <div>
              <span>Ledger</span>
              <strong>{settings.ledger.name}</strong>
            </div>
            <div>
              <span>Currency</span>
              <strong>{settings.ledger.defaultCurrency}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function formatExportFormat(format: string) {
  switch (format) {
    case "transactions_csv":
      return "Transactions CSV";
    case "backup_package":
      return "Backup package";
    default:
      return format;
  }
}

function formatExportTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getExportJobDetail(job: ExportJobSummary) {
  if (job.status === "failed") {
    return job.errorMessage ?? "Export failed";
  }

  if (job.status === "running") {
    return "Generating export";
  }

  return job.artifactUrl ?? "Generated export";
}

function formatAuditAction(action: string) {
  return action
    .split(".")
    .map((part) => part.replace("_", " "))
    .join(" ");
}

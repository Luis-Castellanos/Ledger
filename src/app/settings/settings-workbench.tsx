"use client";

import { FormEvent, useEffect, useState } from "react";
import { Archive, Cloud, Database, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { updateLedgerSettingsSchema } from "@/lib/finance/settings";
import { getSetupReadiness, getSetupReadinessChecks, type SetupStatus, type SetupReadinessCheck } from "@/lib/setup/status";

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

const fallbackSetupStatus: SetupStatus = {
  appUrlConfigured: false,
  clerkConfigured: false,
  clerkKeyMode: "missing",
  databaseConfigured: false,
  nodeEnv: "development",
  vercelDetected: false,
  vercelEnvironment: null,
};

export function SettingsWorkbench() {
  const [settings, setSettings] = useState<SettingsState>(fallbackSettings);
  const [formState, setFormState] = useState(fallbackSettings.ledger);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [exportHistory, setExportHistory] = useState<ExportJobSummary[]>(fallbackExportJobs);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>(fallbackSetupStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const setupReadiness = getSetupReadiness(setupStatus);
  const releaseTasks = getReleaseTasks(setupStatus);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [meResponse, setupResponse, exportJobsResponse] = await Promise.all([
          fetch("/api/me", { headers: { Accept: "application/json" } }),
          fetch("/api/setup/status", { headers: { Accept: "application/json" } }),
          fetch("/api/export-jobs", { headers: { Accept: "application/json" } }),
        ]);

        if (!meResponse.ok) {
          throw new Error("Settings API unavailable");
        }

        const payload = (await meResponse.json()) as SettingsState;
        const setupPayload = setupResponse.ok ? ((await setupResponse.json()) as { status: SetupStatus }) : { status: fallbackSetupStatus };
        const exportJobsPayload = exportJobsResponse.ok
          ? ((await exportJobsResponse.json()) as { exportJobs: ExportJobSummary[] })
          : { exportJobs: [] };

        if (isMounted) {
          setSettings(payload);
          setFormState(payload.ledger);
          setSetupStatus(setupPayload.status);
          setExportHistory(exportJobsPayload.exportJobs);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setSettings(fallbackSettings);
          setFormState(fallbackSettings.ledger);
          setExportHistory(fallbackExportJobs);
          void fetch("/api/setup/status", { headers: { Accept: "application/json" } })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: { status: SetupStatus } | null) => {
              if (payload && isMounted) {
                setSetupStatus(payload.status);
              }
            })
            .catch(() => undefined);
          setDataSource("demo");
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
      setDataSource("database");
      setMessage("Settings saved.");
    } catch {
      setSettings((current) => ({ ...current, ledger: parsed.data }));
      setDataSource("demo");
      setMessage("Saved in local demo mode. Configure Clerk and DATABASE_URL to persist settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="settings-grid">
      <section className="settings-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <SettingsMetric label="Identity" value={settings.user.displayName ?? "Signed in user"} icon={<UserRound size={17} />} />
          <SettingsMetric label="Persistence" value={dataSource === "database" ? "Database backed" : "Demo mode"} icon={<Database size={17} />} />
          <SettingsMetric label="Release gate" value={`${setupReadiness.readyCount}/${setupReadiness.requiredCount} ready`} icon={<Cloud size={17} />} />
        </div>

        <section className="panel settings-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Ledger settings</p>
              <h2 className="panel-title">Ownership boundary</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
          </div>

          <form className="account-form settings-form" onSubmit={handleSubmit}>
            <label>
              <span>Ledger name</span>
              <input
                required
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                placeholder="Personal ledger"
              />
            </label>
            <label>
              <span>Default currency</span>
              <input
                required
                maxLength={3}
                value={formState.defaultCurrency}
                onChange={(event) => setFormState((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))}
              />
            </label>
            {message ? <p className={message.startsWith("Settings saved") ? "form-success" : "form-error"}>{message}</p> : null}
            <button className="primary-action" type="submit">
              <Save size={16} />
              {isSaving ? "Saving" : "Save settings"}
            </button>
          </form>

          <div className="release-checklist" aria-label="Release checklist">
            {releaseTasks.map((task) => (
              <div className="release-checklist-item" data-state={task.done ? "ready" : "blocked"} key={task.label}>
                <span>{task.done ? "Ready" : "Required"}</span>
                <strong>{task.label}</strong>
                <p>{task.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel settings-panel" aria-label="Export history">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Export history</p>
              <h2 className="panel-title">Backup and portability log</h2>
            </div>
            <a className="secondary-action" href="/api/exports?format=backup_package">
              <Archive size={16} />
              New backup
            </a>
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
                    <strong>{job.artifactUrl ?? job.errorMessage ?? "Pending artifact"}</strong>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No exports yet. Generate a backup package to create the first export job.</p>
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

        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Setup</p>
              <h2 className="panel-title">Production readiness</h2>
            </div>
            <div className="summary-icon">
              <ShieldCheck size={17} />
            </div>
          </div>
          <div className="settings-facts">
            <SetupFact label="Clerk" ready={setupStatus.clerkConfigured} readyText="Configured" missingText="Missing keys" />
            <div>
              <span>Clerk keys</span>
              <strong className={setupStatus.clerkKeyMode === "live" ? "setup-ready" : "setup-missing"}>{getClerkKeyModeLabel(setupStatus.clerkKeyMode)}</strong>
            </div>
            <SetupFact label="Production auth" ready={setupStatus.clerkKeyMode === "live"} readyText="Live keys set" missingText="Needs Clerk live keys" />
            <SetupFact label="Neon" ready={setupStatus.databaseConfigured} readyText="Database URL set" missingText="Missing DATABASE_URL" />
            <SetupFact label="App URL" ready={setupStatus.appUrlConfigured} readyText="Configured" missingText="Missing app URL" />
            <div>
              <span>Vercel</span>
              <strong>{setupStatus.vercelDetected ? setupStatus.vercelEnvironment ?? "Detected" : "Local runtime"}</strong>
            </div>
            <div>
              <span>Runtime</span>
              <strong>{setupStatus.nodeEnv}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function getReleaseTasks(status: SetupStatus) {
  return getSetupReadinessChecks(status).map((check) => ({
    done: check.ready,
    label: check.label,
    detail: getReleaseTaskDetail(check),
  }));
}

function getReleaseTaskDetail(check: SetupReadinessCheck) {
  const details: Record<SetupReadinessCheck["key"], { ready: string; missing: string }> = {
    appUrl: {
      ready: "Redirects and export links have an app origin.",
      missing: "Set NEXT_PUBLIC_APP_URL for the deployed app.",
    },
    clerkKeys: {
      ready: "Authentication variables are present.",
      missing: "Add Clerk publishable and secret keys.",
    },
    clerkLiveKeys: {
      ready: "Live Clerk keys are active.",
      missing: "Configure Clerk production and deploy live keys.",
    },
    database: {
      ready: "Server routes can persist ledger data.",
      missing: "Add DATABASE_URL before DB-backed production use.",
    },
    securityHeaders: {
      ready: "CSP, frame, content type, referrer, permissions, and HSTS headers are configured.",
      missing: "Configure release security headers before private beta.",
    },
    rateLimits: {
      ready: "Import mutations and export generation have server-side request limits.",
      missing: "Add server-side rate limits for import and export paths.",
    },
    observability: {
      ready: "Server failures are logged with structured metadata and sensitive fields redacted.",
      missing: "Add redacted server-side error logging before private beta.",
    },
  };

  return check.ready ? details[check.key].ready : details[check.key].missing;
}

function getClerkKeyModeLabel(mode: SetupStatus["clerkKeyMode"]) {
  switch (mode) {
    case "live":
      return "Live keys";
    case "test":
      return "Development keys";
    case "mixed":
      return "Mixed key environments";
    case "unknown":
      return "Unknown key mode";
    case "missing":
      return "Missing keys";
  }
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

function SetupFact({ label, ready, readyText, missingText }: { label: string; ready: boolean; readyText: string; missingText: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={ready ? "setup-ready" : "setup-missing"}>{ready ? readyText : missingText}</strong>
    </div>
  );
}

function SettingsMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="stat-panel account-metric">
      <div className="account-metric-icon account-metric-green">{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

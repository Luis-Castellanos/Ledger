"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
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

export function SettingsWorkbench() {
  const [settings, setSettings] = useState<SettingsState>(fallbackSettings);
  const [formState, setFormState] = useState(fallbackSettings.ledger);
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/me", { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error("Settings API unavailable");
        }

        const payload = (await response.json()) as SettingsState;

        if (isMounted) {
          setSettings(payload);
          setFormState(payload.ledger);
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setSettings(fallbackSettings);
          setFormState(fallbackSettings.ledger);
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
          <SettingsMetric label="Authorization" value="Server derived ledger" icon={<ShieldCheck size={17} />} />
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

function SettingsMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="stat-panel account-metric">
      <div className="account-metric-icon account-metric-green">{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Download, Eye, EyeOff, Palette, Save, ScrollText, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ExportButton } from "@/components/export-button";
import { ALL_NAV_ITEMS, ITEM_BY_HREF, normalizeSections } from "@/components/nav-config";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";
import { AVATAR_GRADIENTS, PROFILE_EVENT, type AvatarKind, type ProfileData } from "@/lib/profile/avatars";
import { updateLedgerSettingsSchema } from "@/lib/finance/settings";
import { canUseLocalFallback, demoFallback, fallbackDataSource, productionFallbackMessage } from "@/lib/demo-fallback";

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
  user: { email: "local-demo@vault.local", displayName: "Local Demo" },
  ledger: { name: "Personal ledger", defaultCurrency: "USD" },
};

const fallbackProfile: ProfileData = {
  name: "Personal ledger",
  email: "",
  avatarKind: "gradient",
  avatarGradient: "institutional",
  avatarImage: null,
  navHidden: [],
  navLayout: [],
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

const settingTabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "sidebar", label: "Sidebar", icon: Eye },
  { id: "ledger", label: "Ledger", icon: ShieldCheck },
  { id: "exports", label: "Data & exports", icon: Archive },
  { id: "audit", label: "Audit trail", icon: ScrollText },
] as const;

type SettingTab = (typeof settingTabs)[number]["id"];

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas unavailable");
  }
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function SettingsWorkbench() {
  const [activeTab, setActiveTab] = useState<SettingTab>("profile");
  const [settings, setSettings] = useState<SettingsState>(() => demoFallback(fallbackSettings, { user: { email: "", displayName: null }, ledger: fallbackSettings.ledger }));
  const [formState, setFormState] = useState(() => demoFallback(fallbackSettings.ledger, fallbackSettings.ledger));
  const [profileDraft, setProfileDraft] = useState<ProfileData>(fallbackProfile);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }
    return window.localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  });
  const [exportHistory, setExportHistory] = useState<ExportJobSummary[]>(() => demoFallback(fallbackExportJobs, []));
  const [auditTrail, setAuditTrail] = useState<AuditEventSummary[]>(() => demoFallback(fallbackAuditEvents, []));
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasUserEditedSettings = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [meResponse, profileResponse, exportJobsResponse, auditEventsResponse] = await Promise.all([
          fetch("/api/me", { headers: { Accept: "application/json" } }),
          fetch("/api/profile", { headers: { Accept: "application/json" } }),
          fetch("/api/export-jobs", { headers: { Accept: "application/json" } }),
          fetch("/api/audit-events", { headers: { Accept: "application/json" } }),
        ]);

        if (!meResponse.ok) {
          throw new Error("Settings API unavailable");
        }

        const payload = (await meResponse.json()) as SettingsState;
        const profilePayload = profileResponse.ok ? ((await profileResponse.json()) as { data?: ProfileData }) : { data: undefined };
        const exportJobsPayload = exportJobsResponse.ok ? ((await exportJobsResponse.json()) as { exportJobs: ExportJobSummary[] }) : { exportJobs: [] };
        const auditEventsPayload = auditEventsResponse.ok ? ((await auditEventsResponse.json()) as { auditEvents: AuditEventSummary[] }) : { auditEvents: [] };

        if (!isMounted) {
          return;
        }

        if (!hasUserEditedSettings.current) {
          setSettings(payload);
          setFormState(payload.ledger);
        }
        if (profilePayload.data) {
          setProfileDraft(profilePayload.data);
        }
        setExportHistory(exportJobsPayload.exportJobs);
        setAuditTrail(auditEventsPayload.auditEvents);
      } catch {
        if (isMounted) {
          if (!hasUserEditedSettings.current) {
            setSettings(demoFallback(fallbackSettings, { user: { email: "", displayName: null }, ledger: fallbackSettings.ledger }));
            setFormState(demoFallback(fallbackSettings.ledger, fallbackSettings.ledger));
          }
          setExportHistory(demoFallback(fallbackExportJobs, []));
          setAuditTrail(demoFallback(fallbackAuditEvents, []));
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleNavCount = useMemo(() => ALL_NAV_ITEMS.length - profileDraft.navHidden.length, [profileDraft.navHidden.length]);

  async function handleLedgerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateLedgerSettingsSchema.safeParse(formState);

    if (!parsed.success) {
      setMessage("Ledger name and a three-letter currency code are required.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

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
      setMessage("Ledger settings saved.");
    } catch {
      if (!canUseLocalFallback(fallbackDataSource())) {
        setMessage(productionFallbackMessage("Ledger settings save"));
        return;
      }
      setSettings((current) => ({ ...current, ledger: parsed.data }));
      setFormState(parsed.data);
      setMessage("Settings are saved for this session. Permanent saving is unavailable right now.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: profileDraft.name.trim(),
          avatarKind: profileDraft.avatarKind,
          avatarGradient: profileDraft.avatarGradient,
          avatarImage: profileDraft.avatarKind === "image" ? profileDraft.avatarImage : null,
        }),
      });
      const payload = (await response.json()) as { data?: ProfileData; error?: { message?: string } };

      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not save profile.");
      }

      setProfileDraft(payload.data);
      window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: payload.data }));
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSidebar() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ navLayout: normalizeSections(profileDraft.navLayout), navHidden: profileDraft.navHidden }),
      });
      const payload = (await response.json()) as { data?: ProfileData; error?: { message?: string } };

      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not save sidebar.");
      }

      setProfileDraft(payload.data);
      window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: payload.data }));
      setMessage("Sidebar saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save sidebar.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateTheme(nextTheme: string) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  async function onPickImage(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setProfileDraft((current) => ({ ...current, avatarKind: "image", avatarImage: dataUrl }));
      setMessage(null);
    } catch {
      setMessage("Could not read that image. Try a PNG, JPEG, or WebP.");
    }
  }

  function updateSectionLabel(sectionId: string, label: string) {
    setProfileDraft((current) => ({
      ...current,
      navLayout: normalizeSections(current.navLayout).map((section) => (section.id === sectionId ? { ...section, label } : section)),
    }));
  }

  function moveNavItem(href: string, sectionId: string) {
    setProfileDraft((current) => ({
      ...current,
      navLayout: normalizeSections(current.navLayout).map((section) => ({
        ...section,
        items: section.id === sectionId ? (section.items.includes(href) ? section.items : [...section.items, href]) : section.items.filter((item) => item !== href),
      })),
    }));
  }

  function toggleNavVisibility(href: string) {
    setProfileDraft((current) => {
      const hidden = new Set(current.navHidden);
      if (hidden.has(href)) {
        hidden.delete(href);
      } else {
        hidden.add(href);
      }
      return { ...current, navHidden: [...hidden] };
    });
  }

  function addSection() {
    setProfileDraft((current) => ({
      ...current,
      navLayout: [...normalizeSections(current.navLayout), { id: `section-${Date.now()}`, label: "New section", items: [] }],
    }));
  }

  function deleteSection(sectionId: string) {
    setProfileDraft((current) => {
      const sections = normalizeSections(current.navLayout);
      if (sections.length <= 1) {
        return current;
      }
      return { ...current, navLayout: normalizeSections(sections.filter((section) => section.id !== sectionId)) };
    });
  }

  const normalizedLayout = normalizeSections(profileDraft.navLayout);
  const sectionOptions = normalizedLayout.map((section) => ({ value: section.id, label: section.label || "Untitled" }));

  return (
    <div className="grid min-h-[calc(100vh-81px)] grid-cols-1 border-t border-border-subtle lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-border-subtle bg-surface-1/70 p-3 lg:border-b-0 lg:border-r">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Settings sections">
          {settingTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  active ? "bg-accent-soft text-accent-300" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage(null);
                }}
                type="button"
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 p-5 lg:p-7">
        <div className="mb-5 flex flex-col gap-2 border-b border-border-subtle pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Settings</p>
            <h2 className="mt-1 text-[24px] font-semibold tracking-normal text-text-primary">{settingTabs.find((tab) => tab.id === activeTab)?.label}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-tertiary">
            <span>{settings.user.email}</span>
            <span className="rounded-full border border-border-subtle px-2 py-1">{settings.ledger.defaultCurrency}</span>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 text-[13px] text-text-secondary" role="status">
            {message}
          </div>
        ) : null}

        {activeTab === "profile" ? (
          <section className="max-w-3xl rounded-xl border border-border-subtle bg-surface-1 p-5">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <Avatar className="ring-1 ring-border-subtle" gradient={profileDraft.avatarGradient} image={profileDraft.avatarImage} kind={profileDraft.avatarKind} name={profileDraft.name} size={76} />
                <span className="text-[11px] text-text-muted">Sidebar preview</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <label className="flex max-w-md flex-col gap-1.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">Display name</span>
                  <input
                    className="rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-strong"
                    maxLength={80}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Your name"
                    value={profileDraft.name}
                  />
                </label>

                <div className="flex flex-col gap-2.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">Avatar</span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="cursor-pointer rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-surface-2">
                      Upload photo
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          void onPickImage(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    {profileDraft.avatarKind === "image" && profileDraft.avatarImage ? (
                      <button className="text-[12px] text-text-tertiary transition-colors hover:text-negative" onClick={() => setProfileDraft((current) => ({ ...current, avatarKind: "gradient", avatarImage: null }))} type="button">
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(AVATAR_GRADIENTS).map(([id, background]) => {
                      const selected = profileDraft.avatarKind === "gradient" && profileDraft.avatarGradient === id;
                      return (
                        <button
                          aria-label={`Use ${id} avatar`}
                          className={`size-8 rounded-full transition-transform hover:scale-105 ${selected ? "ring-2 ring-accent-500 ring-offset-2 ring-offset-surface-1" : "ring-1 ring-border-subtle"}`}
                          key={id}
                          onClick={() => setProfileDraft((current) => ({ ...current, avatarKind: "gradient" as AvatarKind, avatarGradient: id }))}
                          style={{ background }}
                          title={id}
                          type="button"
                        />
                      );
                    })}
                  </div>
                </div>

                <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" disabled={isSaving} onClick={saveProfile} type="button">
                  <Save size={15} />
                  {isSaving ? "Saving" : "Save profile"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "appearance" ? (
          <section className="grid max-w-4xl gap-4 md:grid-cols-2">
            {["dark", "light"].map((option) => (
              <button
                className={`rounded-xl border p-5 text-left transition-colors ${
                  theme === option ? "border-accent-500 bg-accent-soft" : "border-border-subtle bg-surface-1 hover:bg-surface-2"
                }`}
                key={option}
                onClick={() => updateTheme(option)}
                type="button"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">{option}</span>
                <strong className="mt-2 block text-[18px] capitalize text-text-primary">{option} institutional</strong>
                <span className="mt-2 block text-[13px] text-text-tertiary">{option === "dark" ? "Fidelity-inspired graphite and warm-black surfaces." : "Light institutional surfaces with restrained Fidelity green accents."}</span>
              </button>
            ))}
          </section>
        ) : null}

        {activeTab === "sidebar" ? (
          <section className="max-w-6xl">
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-1 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary">Navigation layout</h3>
                <p className="mt-1 text-[12.5px] text-text-tertiary">Rename sections, move pages, or hide pages from the sidebar.</p>
              </div>
              <div className="text-[12px] text-text-tertiary">{visibleNavCount} visible pages</div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {normalizedLayout.map((section) => (
                <article className="overflow-hidden rounded-xl border border-border-subtle bg-surface-1" key={section.id}>
                  <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary outline-none focus:text-text-primary"
                      maxLength={40}
                      onChange={(event) => updateSectionLabel(section.id, event.target.value)}
                      value={section.label}
                    />
                    <button
                      aria-label={`Delete ${section.label}`}
                      className="text-[18px] leading-none text-text-muted transition-colors hover:text-negative disabled:opacity-30"
                      disabled={normalizedLayout.length <= 1}
                      onClick={() => deleteSection(section.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col py-1">
                    {section.items.map((href) => {
                      const item = ITEM_BY_HREF.get(href);
                      if (!item) {
                        return null;
                      }
                      const Icon = item.Icon;
                      const visible = !profileDraft.navHidden.includes(href);
                      return (
                        <div className="flex items-center gap-2.5 px-3 py-2" key={href}>
                          <button
                            aria-label={visible ? `Hide ${item.label}` : `Show ${item.label}`}
                            className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                              visible ? "border-accent-500 bg-accent-500 text-white" : "border-border-strong text-text-muted"
                            }`}
                            onClick={() => toggleNavVisibility(href)}
                            type="button"
                          >
                            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <Icon className={visible ? "text-text-secondary" : "text-text-muted"} size={16} />
                          <span className={`min-w-0 flex-1 truncate text-[13px] ${visible ? "text-text-primary" : "text-text-muted line-through"}`}>{item.label}</span>
                          <select
                            aria-label={`Move ${item.label}`}
                            className="w-28 rounded-md border border-border-subtle bg-surface-base px-2 py-1 text-[12px] text-text-secondary outline-none"
                            onChange={(event) => moveNavItem(href, event.target.value)}
                            value={section.id}
                          >
                            {sectionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="rounded-lg border border-border-subtle px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2" onClick={addSection} type="button">
                Add section
              </button>
              <button className="rounded-lg bg-accent-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" disabled={isSaving} onClick={saveSidebar} type="button">
                {isSaving ? "Saving" : "Save sidebar"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "ledger" ? (
          <form className="max-w-xl rounded-xl border border-border-subtle bg-surface-1 p-5" onSubmit={handleLedgerSubmit}>
            <div className="grid gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">Ledger name</span>
                <input
                  className="rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-strong"
                  onChange={(event) => {
                    hasUserEditedSettings.current = true;
                    setFormState((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Personal ledger"
                  required
                  value={formState.name}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">Default currency</span>
                <input
                  className="w-32 rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-strong"
                  maxLength={3}
                  onChange={(event) => {
                    hasUserEditedSettings.current = true;
                    setFormState((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }));
                  }}
                  required
                  value={formState.defaultCurrency}
                />
              </label>
            </div>
            <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" disabled={isSaving} type="submit">
              <Save size={15} />
              {isSaving ? "Saving" : "Save ledger"}
            </button>
          </form>
        ) : null}

        {activeTab === "exports" ? (
          <section className="max-w-5xl rounded-xl border border-border-subtle bg-surface-1 p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary">Backup and portability log</h3>
                <p className="mt-1 text-[12.5px] text-text-tertiary">Generate CSV exports or a full backup package.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ExportButton className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-60" aria-label="Transactions CSV" format="transactions_csv">
                  <Download size={15} />
                  Transactions CSV
                </ExportButton>
                <ExportButton className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" aria-label="Backup package" format="backup_package">
                  <Archive size={15} />
                  Backup package
                </ExportButton>
              </div>
            </div>
            <div className="divide-y divide-border-subtle">
              {exportHistory.length > 0 ? exportHistory.map((job) => <HistoryRow key={job.id} left={formatExportFormat(job.format)} right={getExportJobDetail(job)} meta={formatExportTimestamp(job.createdAt)} status={job.status} />) : <p className="py-8 text-[13px] text-text-tertiary">No exports yet.</p>}
            </div>
          </section>
        ) : null}

        {activeTab === "audit" ? (
          <section className="max-w-5xl rounded-xl border border-border-subtle bg-surface-1 p-5">
            <h3 className="mb-4 text-[15px] font-semibold text-text-primary">Recent control events</h3>
            <div className="divide-y divide-border-subtle">
              {auditTrail.length > 0 ? auditTrail.map((event) => <HistoryRow key={event.id} left={formatAuditAction(event.action)} right={event.entityId ?? "No entity id"} meta={`${event.actorEmail ?? "System"} · ${formatExportTimestamp(event.createdAt)}`} status={event.entityType.replace("_", " ")} />) : <p className="py-8 text-[13px] text-text-tertiary">No audit events yet.</p>}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}

function HistoryRow({ left, right, meta, status }: { left: string; right: string; meta: string; status: string }) {
  return (
    <article className="grid gap-2 py-3 text-[13px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] md:items-center">
      <div>
        <strong className="block text-text-primary">{left}</strong>
        <span className="text-text-tertiary">{meta}</span>
      </div>
      <div className="truncate text-text-secondary">{right}</div>
      <span className="w-fit rounded-full border border-border-subtle px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-300">{status}</span>
    </article>
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

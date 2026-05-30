import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { SettingsWorkbench } from "./settings-workbench";

export default function SettingsPage() {
  return (
    <AppShell active="Settings">
      <section className="min-w-0">
        <header className="flex min-h-[76px] items-start justify-between gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Personal ledger</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export settings" format="backup_package">
              <Download size={17} />
            </ExportButton>
          </div>
        </header>
        <SettingsWorkbench />
      </section>
    </AppShell>
  );
}

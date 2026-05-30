import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { ImportsWorkbench } from "./imports-workbench";

export default function ImportsPage() {
  return (
    <AppShell active="Imports">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header flex min-h-[92px] items-start justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">CSV control</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Imports</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export import report" format="backup_package">
              <Download size={17} />
            </ExportButton>
          </div>
        </header>
        <ImportsWorkbench />
      </section>
    </AppShell>
  );
}

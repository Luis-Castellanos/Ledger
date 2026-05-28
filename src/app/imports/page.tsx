import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ImportsWorkbench } from "./imports-workbench";

export default function ImportsPage() {
  return (
    <AppShell active="Imports">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">CSV control</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Imports</h1>
          </div>
          <div className="flex items-center gap-2">
            <a className="icon-button" aria-label="Export import report" href="/api/exports?format=backup_package">
              <Download size={17} />
            </a>
          </div>
        </header>
        <ImportsWorkbench />
      </section>
    </AppShell>
  );
}

import { Download, Filter, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { RulesWorkbench } from "./rules-workbench";

export default function RulesPage() {
  return (
    <AppShell active="Rules">
      <section className="min-w-0">
        <header className="flex min-h-[76px] flex-col justify-center gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Classification controls</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Rules</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-button" aria-label="Filter rules">
              <Filter size={17} />
            </button>
            <button className="icon-button" aria-label="Add rule shortcut">
              <Plus size={17} />
            </button>
            <ExportButton className="icon-button" aria-label="Export rules" format="backup_package">
              <Download size={17} />
            </ExportButton>
          </div>
        </header>

        <RulesWorkbench />
      </section>
    </AppShell>
  );
}

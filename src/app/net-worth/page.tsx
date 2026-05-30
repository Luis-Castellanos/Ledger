import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { NetWorthWorkbench } from "./net-worth-workbench";

export default function NetWorthPage() {
  return (
    <AppShell active="Net Worth">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header flex min-h-[92px] items-start justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Position summary</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Net Worth</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export net worth" format="backup_package">
              <Download size={17} />
            </ExportButton>
          </div>
        </header>
        <NetWorthWorkbench />
      </section>
    </AppShell>
  );
}

import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { CashflowWorkbench } from "./cashflow-workbench";

export default function CashflowPage() {
  return (
    <AppShell active="Cashflow">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header flex min-h-[92px] items-start justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Operating flow</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Cashflow</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export cashflow" format="transactions_csv">
              <Download size={17} />
            </ExportButton>
          </div>
        </header>
        <CashflowWorkbench />
      </section>
    </AppShell>
  );
}

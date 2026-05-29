import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { CashflowWorkbench } from "./cashflow-workbench";

export default function CashflowPage() {
  return (
    <AppShell active="Cashflow">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Operating flow</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Cashflow</h1>
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

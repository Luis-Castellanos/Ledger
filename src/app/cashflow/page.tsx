import { Download, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search cashflow" placeholder="Search cashflow" />
            </label>
            <button className="icon-button" aria-label="Filter cashflow">
              <SlidersHorizontal size={17} />
            </button>
            <button className="icon-button" aria-label="Export cashflow">
              <Download size={17} />
            </button>
          </div>
        </header>
        <CashflowWorkbench />
      </section>
    </AppShell>
  );
}

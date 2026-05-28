import { Download, PanelLeft, Search, SlidersHorizontal } from "lucide-react";
import { AccountsWorkbench } from "./accounts-workbench";
import { AppShell } from "@/components/app-shell";

export default function AccountsPage() {
  return (
    <AppShell active="Accounts">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Ledger sources</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Accounts</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search ledger" placeholder="Search ledger" />
            </label>
            <button className="icon-button" aria-label="Filter accounts">
              <SlidersHorizontal size={17} />
            </button>
            <button className="icon-button" aria-label="Export account register">
              <Download size={17} />
            </button>
            <button className="icon-button lg:hidden" aria-label="Toggle navigation">
              <PanelLeft size={18} />
            </button>
          </div>
        </header>
        <AccountsWorkbench />
      </section>
    </AppShell>
  );
}

import { CheckCircle2, Download, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReviewWorkbench } from "./review-workbench";

export default function ReviewPage() {
  return (
    <AppShell active="Review">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Ledger controls</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Review</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search review queue" placeholder="Search review" />
            </label>
            <button className="icon-button" aria-label="Filter review queue">
              <SlidersHorizontal size={17} />
            </button>
            <button className="icon-button" aria-label="Export review queue">
              <Download size={17} />
            </button>
            <button className="icon-button" aria-label="Mark visible reviewed">
              <CheckCircle2 size={17} />
            </button>
          </div>
        </header>
        <ReviewWorkbench />
      </section>
    </AppShell>
  );
}

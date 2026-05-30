import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { ReviewWorkbench } from "./review-workbench";

export default function ReviewPage() {
  return (
    <AppShell active="Review">
      <section className="min-w-0">
        <header className="flex min-h-[76px] flex-col justify-center gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Ledger controls</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Review</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export review queue" format="transactions_csv">
              <Download size={17} />
            </ExportButton>
          </div>
        </header>
        <ReviewWorkbench />
      </section>
    </AppShell>
  );
}

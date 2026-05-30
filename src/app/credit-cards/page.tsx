import { CreditCard } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CreditCardsWorkbench } from "./credit-cards-workbench";

export default function CreditCardsPage() {
  return (
    <AppShell active="Credit Cards">
      <section className="min-w-0">
        <header className="flex min-h-[76px] items-start justify-between gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Liability control</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Credit Cards</h1>
          </div>
          <div className="summary-icon">
            <CreditCard size={17} />
          </div>
        </header>
        <CreditCardsWorkbench />
      </section>
    </AppShell>
  );
}

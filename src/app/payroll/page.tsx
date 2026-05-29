import { Landmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PayrollWorkbench } from "./payroll-workbench";

export default function PayrollPage() {
  return (
    <AppShell active="Payroll">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Compensation ledger</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Payroll</h1>
          </div>
          <div className="summary-icon">
            <Landmark size={17} />
          </div>
        </header>
        <PayrollWorkbench />
      </section>
    </AppShell>
  );
}

import { Landmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PayrollWorkbench } from "./payroll-workbench";

export default function PayrollPage() {
  return (
    <AppShell active="Payroll">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header flex min-h-[92px] items-start justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Compensation ledger</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Payroll</h1>
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

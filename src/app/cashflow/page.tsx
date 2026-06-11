import { AppShell } from "@/components/app-shell";
import { CashflowWorkbench } from "./cashflow-workbench";

export default function CashflowPage() {
  return (
    <AppShell active="/cashflow">
      <CashflowWorkbench />
    </AppShell>
  );
}

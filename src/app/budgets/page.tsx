import { AppShell } from "@/components/app-shell";
import { BudgetsWorkbench } from "./budgets-workbench";

export default function BudgetsPage() {
  return (
    <AppShell active="/budgets">
      <BudgetsWorkbench />
    </AppShell>
  );
}

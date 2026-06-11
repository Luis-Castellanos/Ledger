import { AppShell } from "@/components/app-shell";
import { RulesWorkbench } from "./rules-workbench";

export default function RulesPage() {
  return (
    <AppShell active="/rules">
      <RulesWorkbench />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { GoalsWorkbench } from "./goals-workbench";

export default function GoalsPage() {
  return (
    <AppShell active="/goals">
      <GoalsWorkbench />
    </AppShell>
  );
}

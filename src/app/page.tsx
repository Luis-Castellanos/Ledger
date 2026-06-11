import { AppShell } from "@/components/app-shell";
import { DashboardWorkbench } from "./dashboard-workbench";

export default function Home() {
  return (
    <AppShell active="/">
      <DashboardWorkbench />
    </AppShell>
  );
}

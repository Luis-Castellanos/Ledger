import { AppShell } from "@/components/app-shell";
import { SettingsWorkbench } from "./settings-workbench";

export default function SettingsPage() {
  return (
    <AppShell active="/settings">
      <SettingsWorkbench />
    </AppShell>
  );
}

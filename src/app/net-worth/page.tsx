import { AppShell } from "@/components/app-shell";
import { NetWorthWorkbench } from "./net-worth-workbench";

export default function NetWorthPage() {
  return (
    <AppShell active="/net-worth">
      <NetWorthWorkbench />
    </AppShell>
  );
}

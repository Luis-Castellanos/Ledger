import { AppShell } from "@/components/app-shell";
import { ReviewWorkbench } from "./review-workbench";

export default function ReviewPage() {
  return (
    <AppShell active="/review">
      <ReviewWorkbench />
    </AppShell>
  );
}

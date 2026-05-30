import { Files } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { UploadWorkbench } from "./upload-workbench";

export default function UploadPage() {
  return (
    <AppShell active="Upload">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header flex min-h-[92px] items-start justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Statement intake</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Upload</h1>
          </div>
          <a className="secondary-action" href="/files">
            <Files size={16} />
            Files
          </a>
        </header>
        <UploadWorkbench />
      </section>
    </AppShell>
  );
}

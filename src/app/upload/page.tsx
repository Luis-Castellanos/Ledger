import { Files } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { UploadWorkbench } from "./upload-workbench";

export default function UploadPage() {
  return (
    <AppShell active="Upload">
      <section className="min-w-0">
        <header className="flex min-h-[76px] items-start justify-between gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 lg:px-7">
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

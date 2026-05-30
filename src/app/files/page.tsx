import { Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FilesWorkbench } from "./files-workbench";

export default function FilesPage() {
  return (
    <AppShell active="Files">
      <section className="min-w-0">
        <header className="fidelity-dashboard-header flex min-h-[92px] items-start justify-between gap-4 px-8 py-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Source evidence</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Files</h1>
          </div>
          <a className="secondary-action" href="/upload">
            <Upload size={16} />
            Upload
          </a>
        </header>
        <FilesWorkbench />
      </section>
    </AppShell>
  );
}

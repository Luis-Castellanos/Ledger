import { Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FilesWorkbench } from "./files-workbench";

export default function FilesPage() {
  return (
    <AppShell active="Files">
      <section className="min-w-0">
        <header className="flex min-h-[76px] items-start justify-between gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 lg:px-7">
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

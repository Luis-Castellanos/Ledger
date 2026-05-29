import { Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FilesWorkbench } from "./files-workbench";

export default function FilesPage() {
  return (
    <AppShell active="Files">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Source evidence</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Files</h1>
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

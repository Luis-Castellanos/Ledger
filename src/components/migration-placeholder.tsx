import { AppShell } from "@/components/app-shell";

export function MigrationPlaceholder({
  active,
  description,
  title,
}: {
  active: string;
  description: string;
  title: string;
}) {
  return (
    <AppShell active={active}>
      <section className="min-w-0 flex-1">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-border-subtle px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-text-tertiary">Migration workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-text-primary md:text-3xl">{title}</h1>
          </div>
        </header>
        <div className="p-5 lg:p-7">
          <section className="max-w-3xl rounded-[18px] border border-border-subtle bg-surface-1 p-6">
            <p className="text-sm leading-6 text-text-secondary">{description}</p>
            <p className="mt-4 text-sm leading-6 text-text-tertiary">
              This route exists so the Gringotts sidebar can land cleanly while the full page, schema, and API behavior are ported.
            </p>
          </section>
        </div>
      </section>
    </AppShell>
  );
}

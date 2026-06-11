import { ClipboardCheck, FileInput, PiggyBank } from "lucide-react";

/*
 * Shared frame for the sign-in / sign-up pages: brand panel on the left,
 * Clerk's widget centered on the right, single column on small screens.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="relative flex flex-col justify-between overflow-hidden border-b border-border bg-sidebar px-8 py-10 lg:w-[44%] lg:border-b-0 lg:border-r lg:px-14 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(110%_70%_at_0%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%)]"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-display text-lg font-semibold text-primary-foreground">
            L
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">Ledger</span>
        </div>

        <div className="relative py-10 lg:py-0">
          <h1 className="max-w-md font-display text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            Every dollar in, every dollar out — one calm place.
          </h1>
          <ul className="mt-8 hidden max-w-sm space-y-4 lg:block">
            <BrandPoint icon={<FileInput className="size-4" />} title="Statements in, clarity out">
              Import bank and card CSVs; duplicates catch themselves.
            </BrandPoint>
            <BrandPoint icon={<ClipboardCheck className="size-4" />} title="Review in seconds">
              A keyboard-first queue with smart category suggestions.
            </BrandPoint>
            <BrandPoint icon={<PiggyBank className="size-4" />} title="Budgets &amp; goals">
              Monthly plans and savings targets, tracked against reality.
            </BrandPoint>
          </ul>
        </div>

        <p className="label-caps relative hidden lg:block">Your data, your ledger — exportable any time</p>
      </aside>

      <section className="flex flex-1 items-center justify-center px-4 py-12">{children}</section>
    </main>
  );
}

function BrandPoint({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

export const clerkAppearance = {
  variables: {
    colorPrimary: "#2e9d62",
    borderRadius: "0.75rem",
  },
  elements: {
    cardBox: { boxShadow: "0 1px 3px rgba(37,45,40,0.08)", border: "1px solid rgba(37,45,40,0.1)" },
  },
};

import { Download, PanelLeft } from "lucide-react";
import { AccountsWorkbench } from "./accounts-workbench";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";

type AccountsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = (await searchParams) ?? {};
  const initialAccount = singleValue(params.account) ?? "";

  return (
    <AppShell active="Accounts">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Ledger sources</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Accounts</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export account register" format="backup_package">
              <Download size={17} />
            </ExportButton>
            <button className="icon-button lg:hidden" aria-label="Toggle navigation">
              <PanelLeft size={18} />
            </button>
          </div>
        </header>
        <AccountsWorkbench initialAccount={initialAccount} />
      </section>
    </AppShell>
  );
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

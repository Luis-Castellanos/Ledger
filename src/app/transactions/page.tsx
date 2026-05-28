import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { defaultTransactionFilters, type TransactionFilterState } from "@/lib/finance/transaction-filters";
import { TransactionsWorkbench } from "./transactions-workbench";

type TransactionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = (await searchParams) ?? {};
  const initialFilters = buildInitialFilters(params);

  return (
    <AppShell active="Transactions">
      <section className="min-w-0">
        <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Ledger activity</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Transactions</h1>
          </div>
          <div className="flex items-center gap-2">
            <a className="icon-button" aria-label="Export transactions" href="/api/exports?format=transactions_csv">
              <Download size={17} />
            </a>
          </div>
        </header>
        <TransactionsWorkbench initialFilters={initialFilters} />
      </section>
    </AppShell>
  );
}

function buildInitialFilters(params: Record<string, string | string[] | undefined>): TransactionFilterState {
  const status = singleValue(params.status);
  const transfer = singleValue(params.transfer);
  const direction = singleValue(params.direction);

  return {
    query: singleValue(params.q) ?? defaultTransactionFilters.query,
    status: isOneOf(status, ["needs_review", "reviewed", "excluded"]) ? status : defaultTransactionFilters.status,
    account: singleValue(params.account) ?? defaultTransactionFilters.account,
    category: singleValue(params.category) ?? defaultTransactionFilters.category,
    tag: singleValue(params.tag) ?? defaultTransactionFilters.tag,
    transfer: isOneOf(transfer, ["none", "transfer"]) ? transfer : defaultTransactionFilters.transfer,
    direction: isOneOf(direction, ["all", "inflow", "outflow"]) ? direction : defaultTransactionFilters.direction,
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isOneOf<const T extends string>(value: string | undefined, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

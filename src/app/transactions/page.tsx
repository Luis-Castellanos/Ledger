import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
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
        <header className="flex min-h-[76px] items-start justify-between gap-4 border-b border-[var(--line)] bg-[rgba(32,25,19,0.62)] px-5 py-4 lg:px-7">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Ledger activity</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-normal text-[var(--ink-strong)]">Transactions</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton className="icon-button" aria-label="Export transactions" format="transactions_csv">
              <Download size={17} />
            </ExportButton>
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
  const sort = singleValue(params.sort);

  return {
    query: singleValue(params.q) ?? defaultTransactionFilters.query,
    status: isOneOf(status, ["needs_review", "reviewed", "excluded"]) ? status : defaultTransactionFilters.status,
    account: singleValue(params.account) ?? defaultTransactionFilters.account,
    category: singleValue(params.category) ?? defaultTransactionFilters.category,
    tag: singleValue(params.tag) ?? defaultTransactionFilters.tag,
    transfer: isOneOf(transfer, ["none", "transfer"]) ? transfer : defaultTransactionFilters.transfer,
    direction: isOneOf(direction, ["all", "inflow", "outflow"]) ? direction : defaultTransactionFilters.direction,
    sort: isOneOf(sort, ["date_desc", "date_asc", "amount_desc", "amount_asc", "merchant_asc", "category_asc"])
      ? sort
      : defaultTransactionFilters.sort,
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isOneOf<const T extends string>(value: string | undefined, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

import { AppShell } from "@/components/app-shell";
import { parseRegisterFilters } from "./filters";
import { TransactionsWorkbench } from "./transactions-workbench";

type TransactionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = (await searchParams) ?? {};
  const initialFilters = parseRegisterFilters(params);

  return (
    <AppShell active="/transactions">
      <TransactionsWorkbench initialFilters={initialFilters} />
    </AppShell>
  );
}

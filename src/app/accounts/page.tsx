import { AppShell } from "@/components/app-shell";
import { AccountsWorkbench } from "./accounts-workbench";

type AccountsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = (await searchParams) ?? {};
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

  return (
    <AppShell active="/accounts">
      <AccountsWorkbench initialAccountName={single(params.account)} initialType={single(params.type)} />
    </AppShell>
  );
}

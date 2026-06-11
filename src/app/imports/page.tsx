import { AppShell } from "@/components/app-shell";
import { ImportsWorkbench } from "./imports-workbench";

type ImportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const params = (await searchParams) ?? {};
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  return (
    <AppShell active="/imports">
      <ImportsWorkbench initialTab={tab === "history" || tab === "documents" ? tab : "import"} />
    </AppShell>
  );
}

import { Sidebar } from "@/components/sidebar";

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  void active;

  return (
    <main className="min-h-screen bg-surface-base text-text-primary">
      <div className="flex min-h-screen w-full overflow-hidden bg-surface-base">
        <Sidebar reviewCount={37} />
        <div className="min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </main>
  );
}

import { Sidebar } from "@/components/sidebar";
import Link from "next/link";
import { IconAccounts, IconDashboard, IconReview, IconTransactions } from "@/components/nav-icons";

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  void active;

  return (
    <main className="min-h-screen bg-surface-base text-text-primary">
      <div className="flex min-h-screen w-full overflow-hidden bg-[var(--surface-base)]">
        <Sidebar reviewCount={37} />
        <div className="min-w-0 flex-1 overflow-auto bg-[var(--surface-base)] pb-20 md:pb-0">
          {children}
        </div>
        <nav className="mobile-dock" aria-label="Primary mobile navigation">
          <Link href="/">
            <IconDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link href="/transactions">
            <IconTransactions size={18} />
            <span>Activity</span>
          </Link>
          <Link href="/review">
            <IconReview size={18} />
            <span>Review</span>
          </Link>
          <Link href="/accounts">
            <IconAccounts size={18} />
            <span>Accounts</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}

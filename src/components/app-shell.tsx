import {
  BadgeDollarSign,
  BookOpenCheck,
  ChartNoAxesCombined,
  FileUp,
  Landmark,
  ListChecks,
  PanelLeft,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";

const nav = [
  { label: "Dashboard", href: "/", icon: ChartNoAxesCombined },
  { label: "Transactions", href: "/transactions", icon: ReceiptText },
  { label: "Review", href: "/review", icon: ListChecks },
  { label: "Imports", href: "/imports", icon: FileUp },
  { label: "Rules", href: "/rules", icon: SlidersHorizontal },
  { label: "Cashflow", href: "/cashflow", icon: BadgeDollarSign },
  { label: "Net Worth", href: "/net-worth", icon: Landmark },
  { label: "Accounts", href: "/accounts", icon: WalletCards },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)]">
      <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden bg-[var(--app-bg)] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--line)] bg-[var(--rail)] lg:border-b-0 lg:border-r">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-20 items-center justify-between px-6">
              <Link className="flex items-center gap-3 no-underline" href="/">
                <div className="flex size-8 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] text-[var(--ink)]">
                  <BookOpenCheck size={17} />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-[0.08em] text-[var(--ink-strong)]">VAULT</div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Personal ledger</div>
                </div>
              </Link>
              <button className="icon-button lg:hidden" aria-label="Toggle navigation">
                <PanelLeft size={18} />
              </button>
            </div>

            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
              <div className="hidden px-6 pb-2 pt-4 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] lg:block">Ledger</div>
              {nav.map((item) => (
                <Link className={item.label === active ? "nav-item nav-item-active" : "nav-item"} href={item.href} key={item.label}>
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mobile-auth border-t border-[var(--line)] px-3 py-3 lg:hidden">
              <AuthControls />
            </div>

            <div className="mt-auto hidden border-t border-[var(--line)] p-5 lg:block">
              <AuthControls />
              <div className="metric-strip">
                <span>Review queue</span>
                <strong>37</strong>
              </div>
              <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span>Last import</span>
                <span>2h ago</span>
              </div>
            </div>
          </div>
        </aside>

        {children}
      </div>
    </main>
  );
}

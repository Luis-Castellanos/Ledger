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
  WalletCards,
} from "lucide-react";
import Link from "next/link";

const nav = [
  { label: "Dashboard", href: "/", icon: ChartNoAxesCombined },
  { label: "Transactions", href: "#", icon: ReceiptText },
  { label: "Review", href: "#", icon: ListChecks },
  { label: "Imports", href: "#", icon: FileUp },
  { label: "Cashflow", href: "#", icon: BadgeDollarSign },
  { label: "Net Worth", href: "#", icon: Landmark },
  { label: "Accounts", href: "/accounts", icon: WalletCards },
  { label: "Settings", href: "#", icon: Settings },
];

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(72,105,92,0.22),_transparent_34%),linear-gradient(120deg,#f4f3ef_0%,#d8d8d3_42%,#2f3330_100%)] p-3 text-[var(--ink)] sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1440px] grid-cols-1 overflow-hidden rounded-[8px] border border-white/10 bg-[var(--app-bg)] shadow-2xl shadow-black/35 lg:grid-cols-[248px_minmax(0,1fr)]">
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

            <div className="mt-auto hidden border-t border-[var(--line)] p-5 lg:block">
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

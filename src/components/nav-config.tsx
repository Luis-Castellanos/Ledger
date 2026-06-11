import type { NavSection } from "@/lib/profile/avatars";
import {
  IconAccounts,
  IconCashflow,
  IconCreditCard,
  IconDashboard,
  IconFiles,
  IconNetWorth,
  IconPayroll,
  IconReview,
  IconRules,
  IconTransactions,
  IconUpload,
} from "./nav-icons";

export type NavHref =
  | "/"
  | "/transactions"
  | "/review"
  | "/payroll"
  | "/credit-cards"
  | "/upload"
  | "/files"
  | "/imports"
  | "/accounts"
  | "/cashflow"
  | "/net-worth"
  | "/rules";

export type NavItem = {
  href: NavHref;
  label: string;
  Icon: (props: { size?: number; className?: string; strokeWidth?: number }) => React.ReactElement;
  showBadge?: boolean;
};

export type NavGroup = { label: string; items: readonly NavItem[] };

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Core",
    items: [
      { href: "/", label: "Dashboard", Icon: IconDashboard },
      { href: "/review", label: "Review", Icon: IconReview, showBadge: true },
      { href: "/transactions", label: "Transactions", Icon: IconTransactions },
    ],
  },
  {
    label: "Workflows",
    items: [
      { href: "/payroll", label: "Payroll", Icon: IconPayroll },
      { href: "/credit-cards", label: "Credit Cards", Icon: IconCreditCard },
      { href: "/imports", label: "Imports", Icon: IconUpload },
      { href: "/upload", label: "Upload", Icon: IconUpload },
      { href: "/files", label: "Files", Icon: IconFiles },
    ],
  },
  {
    label: "Ledger",
    items: [
      { href: "/accounts", label: "Accounts", Icon: IconAccounts },
      { href: "/cashflow", label: "Cashflow", Icon: IconCashflow },
      { href: "/net-worth", label: "Net Worth", Icon: IconNetWorth },
      { href: "/rules", label: "Rules", Icon: IconRules },
    ],
  },
];

export const ALL_NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
export const ALL_NAV_HREFS: readonly NavHref[] = ALL_NAV_ITEMS.map((item) => item.href);
export const ITEM_BY_HREF = new Map<string, NavItem>(ALL_NAV_ITEMS.map((item) => [item.href, item]));

export const DEFAULT_SECTIONS: NavSection[] = [
  { id: "core", label: "Core", items: ["/", "/review", "/transactions"] },
  { id: "workflows", label: "Workflows", items: ["/payroll", "/credit-cards", "/imports", "/upload", "/files"] },
  { id: "ledger", label: "Ledger", items: ["/accounts", "/cashflow", "/net-worth", "/rules"] },
];

export function normalizeSections(raw: NavSection[] | null | undefined): NavSection[] {
  const source = raw && raw.length ? raw : DEFAULT_SECTIONS;
  const placed = new Set<string>();
  let sections: NavSection[] = source
    .filter((section) => section && typeof section.label === "string")
    .map((section, index) => {
      const items = (Array.isArray(section.items) ? section.items : []).filter((href) => ITEM_BY_HREF.has(href) && !placed.has(href));
      items.forEach((href) => placed.add(href));
      return { id: section.id || `section-${index}`, label: section.label, items };
    });

  if (sections.length === 0) {
    sections = [{ id: "main", label: "Menu", items: [] }];
  }

  const missing = ALL_NAV_ITEMS.map((item) => item.href).filter((href) => !placed.has(href));
  if (missing.length) {
    sections[sections.length - 1]!.items.push(...missing);
  }

  return sections;
}

export function resolveSections(layout: NavSection[], navHidden: readonly string[]): { id: string; label: string; items: NavItem[] }[] {
  const hidden = new Set(navHidden);
  return normalizeSections(layout)
    .map((section) => ({
      id: section.id,
      label: section.label,
      items: section.items
        .map((href) => ITEM_BY_HREF.get(href))
        .filter((item): item is NavItem => {
          if (!item) {
            return false;
          }
          return !hidden.has(item.href);
        }),
    }))
    .filter((section) => section.items.length > 0);
}

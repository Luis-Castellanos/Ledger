"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardCheck,
  FileInput,
  FolderOpen,
  LayoutDashboard,
  Landmark,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  UploadCloud,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useReviewCount } from "@/lib/api/queries/review";

type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
};

type SidebarNavGroup = { label: string; items: SidebarNavItem[] };

const SIDEBAR_GROUPS: SidebarNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/review", label: "Review", icon: ClipboardCheck, showBadge: true },
      { href: "/transactions", label: "Transactions", icon: ReceiptText },
    ],
  },
  {
    label: "Ledger",
    items: [
      { href: "/accounts", label: "Accounts", icon: Landmark },
      { href: "/cashflow", label: "Cashflow", icon: ArrowLeftRight },
      { href: "/net-worth", label: "Net Worth", icon: TrendingUp },
      { href: "/payroll", label: "Payroll", icon: Wallet },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/imports", label: "Imports", icon: FileInput },
      { href: "/upload", label: "Upload", icon: UploadCloud },
      { href: "/files", label: "Files", icon: FolderOpen },
      { href: "/rules", label: "Rules", icon: SlidersHorizontal },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { data: reviewCount } = useReviewCount();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-2 py-1.5"
          onClick={() => setOpenMobile(false)}
        >
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-display text-base font-semibold text-primary-foreground"
          >
            L
          </span>
          <span className="font-display text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Ledger
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {SIDEBAR_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="label-caps">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.showBadge && typeof reviewCount === "number" && reviewCount > 0 ? (
                        <SidebarMenuBadge className="bg-primary/15 font-money text-primary">
                          {reviewCount > 99 ? "99+" : reviewCount}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
              <Link href="/settings" onClick={() => setOpenMobile(false)}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between gap-2 px-2 pb-1 group-data-[collapsible=icon]:flex-col">
          <AuthControls />
          <ThemeToggle className="text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

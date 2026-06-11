"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { MobileDock } from "@/components/mobile-dock";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  void active;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="pb-20 md:pb-0">
        <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md md:hidden">
          <SidebarTrigger />
          <span className="font-display text-base font-semibold tracking-tight">Ledger</span>
        </div>
        {children}
      </SidebarInset>
      <MobileDock />
      <CommandMenu />
    </SidebarProvider>
  );
}

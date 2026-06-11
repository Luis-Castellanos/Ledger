"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight,
  ClipboardCheck,
  CreditCard,
  FileInput,
  LayoutDashboard,
  Landmark,
  Moon,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Sun,
  TrendingUp,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const DESTINATIONS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/cashflow", label: "Cashflow", icon: ArrowLeftRight },
  { href: "/net-worth", label: "Net Worth", icon: TrendingUp },
  { href: "/credit-cards", label: "Credit Cards", icon: CreditCard },
  { href: "/imports", label: "Imports", icon: FileInput },
  { href: "/rules", label: "Rules", icon: SlidersHorizontal },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command menu" description="Jump anywhere">
      <CommandInput placeholder="Where to?" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Go to">
          {DESTINATIONS.map((destination) => (
            <CommandItem
              key={destination.href}
              onSelect={() => {
                setOpen(false);
                router.push(destination.href);
              }}
            >
              <destination.icon />
              {destination.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Appearance">
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "light" ? "dark" : "light");
              setOpen(false);
            }}
          >
            {resolvedTheme === "light" ? <Moon /> : <Sun />}
            Switch to {resolvedTheme === "light" ? "dark" : "light"} mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

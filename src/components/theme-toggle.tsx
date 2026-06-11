"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // true after hydration only — avoids a server/client mismatch on the icon
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`inline-flex size-9 items-center justify-center rounded-md ${className}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="Theme"
      type="button"
    >
      {mounted ? isDark ? <Sun size={16} /> : <Moon size={16} /> : <Moon size={16} className="opacity-0" />}
    </button>
  );
}

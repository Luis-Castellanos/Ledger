"use client";

import { useState } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }
    return window.localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  });

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} className={className} onClick={toggleTheme} title="Theme" type="button">
      {theme === "dark" ? (
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="18">
          <path d="M12 3v2M12 19v2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M3 12h2M19 12h2M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="18">
          <path d="M21 12.79A8.5 8.5 0 1 1 11.21 3 6.5 6.5 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

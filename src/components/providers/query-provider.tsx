"use client";

import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useState } from "react";

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // headless dev browsers (preview tooling, Playwright) report a hidden tab,
  // which would pause query retries forever — pin focus in dev only
  focusManager.setFocused(true);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
            // same-origin APIs: don't let the OS's offline signal pause queries
            networkMode: "always",
          },
          mutations: {
            networkMode: "always",
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/keys";
import type { ApiCategory } from "@/lib/api/types";

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiFetch.get<{ categories: ApiCategory[] }>("/api/categories"),
    select: (response) => response.categories,
  });
}

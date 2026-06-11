"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useReviewCount() {
  return useQuery({
    queryKey: ["review", "count"],
    queryFn: () => apiFetch.get<{ data: { count: number } }>("/api/review/count"),
    select: (response) => response.data.count,
    refetchInterval: 60_000,
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useHasLedgerData() {
  return useQuery({
    queryKey: ["sample-data", "status"],
    queryFn: () => apiFetch.get<{ data: { hasData: boolean; transactionCount: number } }>("/api/sample-data"),
    select: (response) => response.data,
  });
}

export type SampleDataSummary = {
  accounts: number;
  transactions: number;
  snapshots: number;
  budgets: number;
  goals: number;
  rules: number;
};

export function useLoadSampleData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch.post<{ data: SampleDataSummary }>("/api/sample-data"),
    onSuccess: () => {
      // everything changed — refresh the whole cache
      void queryClient.invalidateQueries();
    },
  });
}

export function useResetLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch.delete<{ data: { reset: boolean } }>("/api/sample-data"),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}

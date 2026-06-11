"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/keys";
import type { ApiAccount, ApiBalanceSnapshot } from "@/lib/api/types";

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => apiFetch.get<{ accounts: ApiAccount[] }>("/api/accounts"),
    select: (response) => response.accounts,
  });
}

export function useBalanceSnapshots(limit = 1000) {
  return useQuery({
    queryKey: [...queryKeys.snapshots, limit],
    queryFn: () => apiFetch.get<{ snapshots: ApiBalanceSnapshot[] }>(`/api/balance-snapshots?limit=${limit}`),
    select: (response) => response.snapshots,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiFetch.post<{ account: ApiAccount }>("/api/accounts", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiFetch.patch<{ account: ApiAccount }>("/api/accounts", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useCreateBalanceSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { accountId: string; asOfDate: string; balance: string }) =>
      apiFetch.post<{ snapshot: ApiBalanceSnapshot }>("/api/balance-snapshots", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.snapshots });
    },
  });
}

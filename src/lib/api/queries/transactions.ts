"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/keys";
import { transactionSearchParams, type ApiTransaction, type ApiTransactionList, type TransactionFilters } from "@/lib/api/types";

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => apiFetch.get<ApiTransactionList>(`/api/transactions${transactionSearchParams(filters)}`),
  });
}

export function useTransactionsInfinite(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactionsInfinite(filters),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(transactionSearchParams(filters).slice(1));
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      const encoded = params.toString();
      return apiFetch.get<ApiTransactionList>(`/api/transactions${encoded ? `?${encoded}` : ""}`);
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["review"] });
  };
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiFetch.post<{ transaction: ApiTransaction }>("/api/transactions", input),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (input: { id: string } & Record<string, unknown>) =>
      apiFetch.patch<{ transaction: ApiTransaction }>("/api/transactions", input),
    onSuccess: invalidate,
  });
}

export function useBulkUpdateTransactions() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiFetch.post<{ updated: number }>("/api/transactions/bulk", input),
    onSuccess: invalidate,
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export type ApiMerchantRule = {
  id: string;
  name: string;
  matchType: "contains" | "exact" | "starts_with";
  matchValue: string;
  priority: number;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  accountId: string | null;
  accountName: string | null;
};

export function useMerchantRules() {
  return useQuery({
    queryKey: ["merchant-rules"],
    queryFn: () => apiFetch.get<{ rules: ApiMerchantRule[] }>("/api/merchant-rules"),
    select: (response) => response.rules,
  });
}

function useInvalidateRules() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["merchant-rules"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["review"] });
  };
}

export function useUpdateMerchantRule() {
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: (body: { id: string; isActive?: boolean; priority?: number; action?: "delete" }) =>
      apiFetch.patch<{ rule: unknown }>("/api/merchant-rules", body),
    onSuccess: invalidate,
  });
}

export function useApplyMerchantRules() {
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: () => apiFetch.post<{ appliedCount: number }>("/api/merchant-rules/apply"),
    onSuccess: invalidate,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; flowType?: string; color?: string }) =>
      apiFetch.post<{ category: unknown }>("/api/categories", body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string; name?: string; flowType?: string; color?: string; isArchived?: boolean }) =>
      apiFetch.patch<{ category: unknown }>("/api/categories", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

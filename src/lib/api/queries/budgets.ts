"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export type BudgetRow = {
  id: string;
  categoryId: string;
  category: string;
  color: string | null;
  amountMinor: number;
  spentMinor: number;
  remainingMinor: number;
  notes: string | null;
};

export type BudgetsResponse = {
  data: {
    month: string;
    rows: BudgetRow[];
    unbudgeted: { categoryId: string; category: string; spentMinor: number }[];
    uncategorizedSpentMinor: number;
    totals: { budgetedMinor: number; spentMinor: number };
  };
};

export type ApiGoal = {
  id: string;
  name: string;
  color: string | null;
  accountId: string | null;
  accountName: string | null;
  targetAmountMinor: number;
  startingAmountMinor: number;
  manualProgressMinor: number;
  currency: string;
  targetDate: string | null;
  status: "active" | "achieved" | "archived";
  progressMinor: number;
  percent: number;
};

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => apiFetch.get<BudgetsResponse>(`/api/budgets?month=${month}`),
    select: (response) => response.data,
  });
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["budgets"] });
}

export function useUpsertBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (body: { categoryId: string; month: string; amount: string; notes?: string }) =>
      apiFetch.post<{ budget: unknown }>("/api/budgets", body),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (id: string) => apiFetch.delete<{ budget: unknown }>("/api/budgets", { id }),
    onSuccess: invalidate,
  });
}

export function useCopyBudgets() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (body: { fromMonth: string; toMonth: string }) =>
      apiFetch.post<{ copied: number }>("/api/budgets/copy", body),
    onSuccess: invalidate,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => apiFetch.get<{ data: { goals: ApiGoal[] } }>("/api/goals"),
    select: (response) => response.data.goals,
  });
}

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["goals"] });
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch.post<{ goal: unknown }>("/api/goals", body),
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch.patch<{ goal: unknown }>(`/api/goals/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (id: string) => apiFetch.delete<{ goal: unknown }>(`/api/goals/${id}`),
    onSuccess: invalidate,
  });
}

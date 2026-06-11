"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/keys";

export type ReviewQueueResponse = {
  data: {
    remaining: number;
    merchantPrefix?: string;
    transaction: {
      id: string;
      date: string;
      amountMinor: number;
      merchant: string;
      rawDescription: string;
      transferStatus: "none" | "transfer";
      tags: string[];
      notes: string | null;
      account: { id: string; displayName: string; type: string };
    } | null;
    similar: {
      id: string;
      date: string;
      amountMinor: number;
      merchant: string;
      rawDescription: string;
      needsReview: boolean;
      category: { id: string; name: string; slug: string; color: string | null } | null;
    }[];
    suggestedCategory: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
      confidence: number;
      basedOn: number;
    } | null;
  };
};

export function useReviewCount() {
  return useQuery({
    queryKey: queryKeys.reviewCount,
    queryFn: () => apiFetch.get<{ data: { count: number } }>("/api/review/count"),
    select: (response) => response.data.count,
    refetchInterval: 60_000,
  });
}

export function useReviewQueue(skipIds: string[]) {
  return useQuery({
    queryKey: queryKeys.reviewQueue(skipIds),
    queryFn: () =>
      apiFetch.get<ReviewQueueResponse>(
        `/api/review/queue${skipIds.length ? `?skip=${encodeURIComponent(skipIds.join(","))}` : ""}`,
      ),
    select: (response) => response.data,
  });
}

function useInvalidateReview() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["review"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };
}

export function useCategorizeTransaction() {
  const invalidate = useInvalidateReview();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch.post<{ updated: number }>(`/api/transactions/${id}/categorize`, body),
    onSuccess: invalidate,
  });
}

export function useUnreviewTransaction() {
  const invalidate = useInvalidateReview();
  return useMutation({
    mutationFn: ({ id, clearCategory = false }: { id: string; clearCategory?: boolean }) =>
      apiFetch.post<{ id: string }>(`/api/transactions/${id}/unreview`, { clearCategory }),
    onSuccess: invalidate,
  });
}

export function useCreateMerchantRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch.post<unknown>("/api/merchant-rules", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["merchant-rules"] });
    },
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export type ApiMe = {
  user: { id: string; email: string; displayName: string | null };
  ledger: { id: string; name: string; defaultCurrency: string };
};

export type ApiAuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorEmail: string | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch.get<ApiMe>("/api/me"),
  });
}

export function useUpdateLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; defaultCurrency?: string }) =>
      apiFetch.patch<{ ledger: ApiMe["ledger"] }>("/api/me", body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string }) => apiFetch.patch<{ data: unknown }>("/api/profile", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useAuditEvents() {
  return useQuery({
    queryKey: ["audit-events"],
    queryFn: () => apiFetch.get<{ auditEvents: ApiAuditEvent[] }>("/api/audit-events"),
    select: (response) => response.auditEvents,
  });
}

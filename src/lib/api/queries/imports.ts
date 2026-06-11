"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { CsvImportColumnMapping } from "@/lib/finance/import-csv";

export type ImportBatch = {
  id: string;
  filename: string;
  account: string;
  status: "staged" | "committed" | "rolled_back";
  uploadedAt: string;
  acceptedRows: number;
  rejectedRows: number;
};

export type ImportRow = {
  id: string;
  rowNumber: number;
  date: string;
  description: string;
  amountMinor: number;
  category: string;
  status: "accepted" | "needs_review" | "duplicate" | "rejected";
};

export type ImportsResponse = {
  selectedImportId: string | null;
  batches: ImportBatch[];
  rows: ImportRow[];
};

export type SavedMapping = {
  id: string;
  accountId: string | null;
  name: string;
  mapping: CsvImportColumnMapping;
};

export type ApiDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  detectedType: string;
  detectedIssuer: string | null;
  statementPeriod: string | null;
  status: string;
  transactionCount: number;
  parseError: string | null;
  uploadedAt: string;
  accountId: string | null;
  accountName: string | null;
};

export function useImports(importId?: string | null) {
  return useQuery({
    queryKey: ["imports", importId ?? "latest"],
    queryFn: () => apiFetch.get<ImportsResponse>(`/api/imports${importId ? `?importId=${importId}` : ""}`),
  });
}

function useInvalidateImports() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["imports"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["review"] });
  };
}

export function useStageImport() {
  const invalidate = useInvalidateImports();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch.post<{ import: { id: string } }>("/api/imports", body),
    onSuccess: invalidate,
  });
}

export function useUpdateImportRow() {
  const invalidate = useInvalidateImports();
  return useMutation({
    mutationFn: (body: { id: string; category?: string; status?: ImportRow["status"] }) =>
      apiFetch.patch<{ row: unknown }>("/api/imports", body),
    onSuccess: invalidate,
  });
}

export function useCommitImport() {
  const invalidate = useInvalidateImports();
  return useMutation({
    mutationFn: (importId: string) =>
      apiFetch.post<{ committedCount: number; duplicateCount: number }>(`/api/imports/${importId}/commit`),
    onSuccess: invalidate,
  });
}

export function useRollbackImport() {
  const invalidate = useInvalidateImports();
  return useMutation({
    mutationFn: (importId: string) => apiFetch.post<{ rolledBackCount: number }>(`/api/imports/${importId}/rollback`),
    onSuccess: invalidate,
  });
}

export function useImportMappings() {
  return useQuery({
    queryKey: ["import-mappings"],
    queryFn: () => apiFetch.get<{ mappings: SavedMapping[] }>("/api/import-mappings"),
    select: (response) => response.mappings,
  });
}

export function useCreateImportMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; accountId?: string; mapping: CsvImportColumnMapping }) =>
      apiFetch.post<{ mapping: SavedMapping }>("/api/import-mappings", body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["import-mappings"] }),
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch.get<{ documents: ApiDocument[] }>("/api/documents"),
    select: (response) => response.documents,
  });
}

export type DocumentUploadSummary = {
  summary: { total: number; uploaded: number; deferred: number; duplicate: number; failed: number };
  results: { id?: string; fileName: string; status: string; detectedType: string; byteSize: number }[];
};

async function postFiles<T>(path: string, files: File[]): Promise<T> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const response = await fetch(path, { method: "POST", body: formData });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (payload ?? {}) as { error?: string };
    throw new Error(body.error || `Upload failed (${response.status})`);
  }
  return payload as T;
}

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => postFiles<DocumentUploadSummary>("/api/documents", files),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string } & Record<string, unknown>) => apiFetch.patch<{ document: unknown }>("/api/documents", body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch.delete<{ document: unknown }>("/api/documents", { id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}

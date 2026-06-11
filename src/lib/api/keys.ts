import type { TransactionFilters } from "@/lib/api/types";

export const queryKeys = {
  accounts: ["accounts"] as const,
  categories: ["categories"] as const,
  snapshots: ["balance-snapshots"] as const,
  transactions: (filters?: TransactionFilters) => ["transactions", filters ?? {}] as const,
  transactionsInfinite: (filters?: TransactionFilters) => ["transactions", "infinite", filters ?? {}] as const,
  reviewCount: ["review", "count"] as const,
  reviewQueue: (skipIds?: string[]) => ["review", "queue", skipIds ?? []] as const,
};

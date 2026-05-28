import type { TransactionStatus, TransactionTransferStatus } from "./transaction-sample-data";

export type DirectionFilter = "all" | "inflow" | "outflow";
export type TransactionSortMode = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "merchant_asc" | "category_asc";

export type TransactionFilterState = {
  query: string;
  status: "all" | TransactionStatus;
  account: string;
  category: string;
  tag: string;
  transfer: "all" | TransactionTransferStatus;
  direction: DirectionFilter;
  sort: TransactionSortMode;
};

export const defaultTransactionFilters: TransactionFilterState = {
  query: "",
  status: "all",
  account: "all",
  category: "all",
  tag: "all",
  transfer: "all",
  direction: "all",
  sort: "date_desc",
};

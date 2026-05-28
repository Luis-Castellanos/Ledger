import type { TransactionStatus, TransactionTransferStatus } from "./transaction-sample-data";

export type DirectionFilter = "all" | "inflow" | "outflow";

export type TransactionFilterState = {
  query: string;
  status: "all" | TransactionStatus;
  account: string;
  category: string;
  transfer: "all" | TransactionTransferStatus;
  direction: DirectionFilter;
};

export const defaultTransactionFilters: TransactionFilterState = {
  query: "",
  status: "all",
  account: "all",
  category: "all",
  transfer: "all",
  direction: "all",
};

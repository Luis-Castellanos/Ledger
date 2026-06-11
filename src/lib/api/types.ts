export type ApiAccount = {
  id: string;
  ledgerId: string;
  name: string;
  institution: string | null;
  mask: string | null;
  type: "checking" | "savings" | "credit_card" | "brokerage" | "loan" | "mortgage" | "cash" | "other";
  assetClass: "asset" | "liability";
  currency: string;
  openedOn: string | null;
  closedOn: string | null;
  isActive: boolean;
  isHidden: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  flowType: "income" | "expense" | "transfer";
  color: string | null;
  isSystem: boolean;
  isArchived: boolean;
};

export type ApiTransaction = {
  id: string;
  date: string;
  account: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  category: string;
  categoryId: string | null;
  merchant: string;
  rawDescription: string;
  notes: string | null;
  status: "needs_review" | "reviewed" | "excluded";
  tags: string[];
  transferStatus: "none" | "transfer";
};

export type ApiTransactionList = {
  transactions: ApiTransaction[];
  nextCursor: string | null;
  totalCount: number;
};

export type ApiBalanceSnapshot = {
  id: string;
  ledgerId: string;
  accountId: string;
  accountName: string;
  asOfDate: string;
  balanceMinor: number;
  currency: string;
  source: "manual" | "import";
  createdAt: string;
};

export type TransactionFilters = {
  q?: string;
  accountId?: string;
  categoryId?: string;
  uncategorized?: boolean;
  status?: "needs_review" | "reviewed" | "excluded";
  transfer?: "none" | "transfer";
  direction?: "inflow" | "outflow";
  from?: string;
  to?: string;
  tag?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "merchant_asc" | "merchant_desc";
  limit?: number;
};

export function transactionSearchParams(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === false) {
      continue;
    }
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

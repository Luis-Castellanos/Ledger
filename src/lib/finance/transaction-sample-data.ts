export type TransactionStatus = "needs_review" | "reviewed" | "excluded";

export type TransactionRow = {
  id: string;
  account: string;
  amountMinor: number;
  category: string;
  date: string;
  merchant: string;
  notes?: string;
  status: TransactionStatus;
};

export const sampleTransactionRows = [
  {
    id: "txn_payroll",
    date: "2026-05-27",
    merchant: "Payroll deposit",
    account: "Operating Checking",
    category: "Payroll",
    amountMinor: 544000,
    status: "reviewed",
  },
  {
    id: "txn_mortgage",
    date: "2026-05-26",
    merchant: "Mortgage payment",
    account: "Operating Checking",
    category: "Mortgage or Rent",
    amountMinor: -285000,
    status: "reviewed",
  },
  {
    id: "txn_costco",
    date: "2026-05-25",
    merchant: "Costco",
    account: "Rewards Card",
    category: "Shopping",
    amountMinor: -10088,
    status: "needs_review",
  },
  {
    id: "txn_apple",
    date: "2026-05-24",
    merchant: "Apple Music",
    account: "Rewards Card",
    category: "Subscriptions",
    amountMinor: -999,
    status: "needs_review",
  },
  {
    id: "txn_interest",
    date: "2026-05-23",
    merchant: "Ally Interest",
    account: "High Yield Reserve",
    category: "Interest",
    amountMinor: 4218,
    status: "reviewed",
  },
  {
    id: "txn_transfer",
    date: "2026-05-22",
    merchant: "Internal transfer",
    account: "Operating Checking",
    category: "Internal Transfer",
    amountMinor: -150000,
    status: "reviewed",
  },
] satisfies TransactionRow[];

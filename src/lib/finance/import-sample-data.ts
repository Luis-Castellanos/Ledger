export type ImportRowStatus = "accepted" | "needs_review" | "duplicate" | "rejected";

export type ImportBatch = {
  acceptedRows: number;
  account: string;
  filename: string;
  id: string;
  rejectedRows: number;
  status: "staged" | "committed";
  uploadedAt: string;
};

export type ImportPreviewRow = {
  amountMinor: number;
  category: string;
  date: string;
  description: string;
  id: string;
  rowNumber: number;
  status: ImportRowStatus;
};

export const sampleImportBatches = [
  {
    id: "import_chase_may",
    filename: "chase-checking-may.csv",
    account: "Operating Checking",
    status: "staged",
    uploadedAt: "2026-05-27 09:14",
    acceptedRows: 184,
    rejectedRows: 7,
  },
  {
    id: "import_amex_may",
    filename: "amex-rewards-may.csv",
    account: "Rewards Card",
    status: "staged",
    uploadedAt: "2026-05-27 09:03",
    acceptedRows: 91,
    rejectedRows: 3,
  },
] satisfies ImportBatch[];

export const sampleImportRows = [
  {
    id: "row_1",
    rowNumber: 12,
    date: "2026-05-24",
    description: "APPLE.COM/BILL",
    category: "Subscriptions",
    amountMinor: -999,
    status: "accepted",
  },
  {
    id: "row_2",
    rowNumber: 13,
    date: "2026-05-24",
    description: "COSTCO WHSE #481",
    category: "Shopping",
    amountMinor: -10088,
    status: "needs_review",
  },
  {
    id: "row_3",
    rowNumber: 14,
    date: "2026-05-23",
    description: "ONLINE TRANSFER TO SAV",
    category: "Internal Transfer",
    amountMinor: -150000,
    status: "accepted",
  },
  {
    id: "row_4",
    rowNumber: 15,
    date: "2026-05-22",
    description: "POS 7 ELEVEN 39148",
    category: "Groceries",
    amountMinor: -518,
    status: "duplicate",
  },
  {
    id: "row_5",
    rowNumber: 16,
    date: "2026-05-22",
    description: "",
    category: "Uncategorized",
    amountMinor: 0,
    status: "rejected",
  },
] satisfies ImportPreviewRow[];

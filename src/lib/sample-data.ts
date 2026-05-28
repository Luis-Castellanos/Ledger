export const ledgerStats = [
  {
    label: "Cash reserve",
    value: "$48,290.12",
    delta: "+4.8%",
    tone: "green" as const,
    trend: [22, 28, 26, 36, 42, 51, 57],
  },
  {
    label: "Spending",
    value: "$9,340.80",
    delta: "-12%",
    tone: "coral" as const,
    trend: [58, 44, 49, 34, 41, 29, 31],
  },
  {
    label: "Review exposure",
    value: "37 rows",
    delta: "+6",
    tone: "violet" as const,
    trend: [18, 24, 22, 34, 31, 38, 44],
  },
];

export const transactions = [
  { merchant: "Payroll deposit", time: "Jul 20, 6:22 PM", amount: 54400, category: "Income", direction: "in", color: "#57b89d" },
  { merchant: "Apple Music", time: "Jul 20, 12:30 PM", amount: -999, category: "Subscription", direction: "out", color: "#d5b96a" },
  { merchant: "7-Eleven", time: "Jul 19, 2:56 PM", amount: -518, category: "Grocery", direction: "out", color: "#3f8cc8" },
  { merchant: "Internal transfer", time: "Jul 19, 1:23 PM", amount: 1300, category: "Transfer", direction: "in", color: "#57b89d" },
  { merchant: "Framer", time: "Jul 19, 10:00 AM", amount: -1499, category: "Software", direction: "out", color: "#d5b96a" },
  { merchant: "Notion", time: "Jul 18, 9:00 PM", amount: -1799, category: "Software", direction: "out", color: "#d5b96a" },
  { merchant: "Mortgage payment", time: "Jul 18, 7:24 PM", amount: -285000, category: "Housing", direction: "out", color: "#d76b64" },
  { merchant: "Costco", time: "Jul 18, 5:38 PM", amount: -10088, category: "Shopping", direction: "out", color: "#6d55a4" },
];

export const categoryBars = [
  { label: "Housing", share: 35, color: "#8c50d5" },
  { label: "Food", share: 12, color: "#57b89d" },
  { label: "Utilities", share: 20, color: "#d5b96a" },
  { label: "Travel", share: 9, color: "#3f8cc8" },
  { label: "Shopping", share: 24, color: "#d76b64" },
];

export const lineSeries = [42, 96, 45, 24, 48, 33, 52];

export const bars = [
  {
    month: "JAN",
    total: 118,
    parts: [
      { value: 46, color: "#6d55a4" },
      { value: 18, color: "#4c9b8b" },
      { value: 10, color: "#2f86c4" },
    ],
  },
  {
    month: "FEB",
    total: 152,
    parts: [
      { value: 50, color: "#d86b62" },
      { value: 14, color: "#4c9b8b" },
      { value: 12, color: "#2f86c4" },
    ],
  },
  {
    month: "MAR",
    total: 182,
    parts: [
      { value: 45, color: "#6d55a4" },
      { value: 12, color: "#4c9b8b" },
      { value: 18, color: "#d9b96c" },
    ],
  },
  {
    month: "APR",
    total: 136,
    parts: [
      { value: 38, color: "#4c9b8b" },
      { value: 18, color: "#d9b96c" },
      { value: 16, color: "#2f86c4" },
    ],
  },
  {
    month: "MAY",
    total: 258,
    parts: [
      { value: 42, color: "#6d55a4" },
      { value: 24, color: "#d86b62" },
      { value: 14, color: "#d9b96c" },
      { value: 12, color: "#4c9b8b" },
    ],
  },
  {
    month: "JUN",
    total: 226,
    parts: [
      { value: 28, color: "#6d55a4" },
      { value: 30, color: "#d86b62" },
      { value: 16, color: "#4c9b8b" },
      { value: 14, color: "#2f86c4" },
    ],
  },
  {
    month: "JUL",
    total: 320,
    parts: [
      { value: 52, color: "#6d55a4" },
      { value: 22, color: "#d86b62" },
      { value: 13, color: "#d9b96c" },
      { value: 12, color: "#4c9b8b" },
    ],
  },
];

export const activity = [
  { label: "Import control", value: "2 staged files", kind: "cash" },
  { label: "Rules applied", value: "184 matches", kind: "rule" },
  { label: "Audit trail", value: "612 events", kind: "shield" },
];

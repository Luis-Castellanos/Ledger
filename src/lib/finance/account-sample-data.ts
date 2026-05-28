export type AccountRow = {
  id: string;
  name: string;
  institution: string;
  mask: string;
  type: string;
  assetClass: "asset" | "liability";
  currency: string;
  balanceMinor: number;
  lastActivity: string;
  status: "active" | "hidden";
};

export const sampleAccounts = [
  {
    id: "acct_checking",
    name: "Operating Checking",
    institution: "Chase",
    mask: "1842",
    type: "checking",
    assetClass: "asset",
    currency: "USD",
    balanceMinor: 1829041,
    lastActivity: "Today",
    status: "active",
  },
  {
    id: "acct_savings",
    name: "High Yield Reserve",
    institution: "Ally",
    mask: "4209",
    type: "savings",
    assetClass: "asset",
    currency: "USD",
    balanceMinor: 4829012,
    lastActivity: "Yesterday",
    status: "active",
  },
  {
    id: "acct_rewards",
    name: "Rewards Card",
    institution: "Amex",
    mask: "9001",
    type: "credit_card",
    assetClass: "liability",
    currency: "USD",
    balanceMinor: -284122,
    lastActivity: "2 days ago",
    status: "active",
  },
  {
    id: "acct_brokerage",
    name: "Taxable Brokerage",
    institution: "Fidelity",
    mask: "7310",
    type: "brokerage",
    assetClass: "asset",
    currency: "USD",
    balanceMinor: 12783455,
    lastActivity: "May 26",
    status: "active",
  },
] satisfies AccountRow[];

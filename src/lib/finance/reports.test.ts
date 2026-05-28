import { describe, expect, it } from "vitest";
import { buildCashflowSummary, buildCategoryFlowMap, buildNetWorthSummary, getBalanceEvidenceSource } from "./reports";
import type { AccountRow } from "./account-sample-data";
import type { TransactionRow } from "./transaction-sample-data";

describe("buildCashflowSummary", () => {
  const categoryFlowByName = buildCategoryFlowMap([
    {
      name: "Income",
      slug: "income",
      flowType: "income",
      color: "#57b89d",
      icon: "banknote",
      children: [{ name: "Payroll", slug: "payroll", flowType: "income", color: "#57b89d", icon: "briefcase" }],
    },
    {
      name: "Expense",
      slug: "expense",
      flowType: "expense",
      color: "#d76b64",
      icon: "receipt",
      children: [{ name: "Groceries", slug: "groceries", flowType: "expense", color: "#d76b64", icon: "basket" }],
    },
    {
      name: "Transfers",
      slug: "transfers",
      flowType: "transfer",
      color: "#7f8a86",
      icon: "arrow-left-right",
      children: [{ name: "Internal Transfer", slug: "transfer", flowType: "transfer", color: "#7f8a86", icon: "arrow-left-right" }],
    },
  ]);

  it("uses category flow type and excludes transfers", () => {
    const summary = buildCashflowSummary(
      [
        row({ id: "payroll", category: "Payroll", amountMinor: 500_00 }),
        row({ id: "groceries", category: "Groceries", amountMinor: -125_00 }),
        row({ id: "transfer", category: "Internal Transfer", amountMinor: -200_00, transferStatus: "transfer" }),
      ],
      categoryFlowByName,
    );

    expect(summary.inflow).toBe(500_00);
    expect(summary.outflow).toBe(125_00);
    expect(summary.excluded).toBe(1);
    expect(summary.byCategory.get("Internal Transfer")).toBeUndefined();
  });

  it("handles refunds and negative income without inflating totals", () => {
    const summary = buildCashflowSummary(
      [
        row({ id: "refund", category: "Groceries", amountMinor: 25_00 }),
        row({ id: "income-reversal", category: "Payroll", amountMinor: -50_00 }),
      ],
      categoryFlowByName,
    );

    expect(summary.inflow).toBe(-50_00);
    expect(summary.outflow).toBe(-25_00);
    expect(summary.byCategory.get("Groceries")).toBe(25_00);
    expect(summary.byCategory.get("Payroll")).toBe(-50_00);
  });
});

describe("buildNetWorthSummary", () => {
  it("treats liabilities as reductions to net worth", () => {
    const summary = buildNetWorthSummary([
      account({ id: "checking", assetClass: "asset", balanceMinor: 250_00 }),
      account({ id: "card", assetClass: "liability", balanceMinor: -80_00 }),
      account({ id: "loan", assetClass: "liability", balanceMinor: 20_00 }),
    ]);

    expect(summary.assets).toBe(250_00);
    expect(summary.liabilities).toBe(100_00);
    expect(summary.netWorth).toBe(150_00);
  });

  it("labels balance evidence source", () => {
    expect(getBalanceEvidenceSource(account({ balanceMinor: 250_00 }), null)).toBe("transaction_derived");
    expect(getBalanceEvidenceSource(account({ balanceMinor: 0 }), null)).toBe("missing_snapshot");
    expect(getBalanceEvidenceSource(account({ balanceMinor: 250_00 }), { balanceMinor: 250_00, source: "manual" })).toBe("manual_snapshot");
    expect(getBalanceEvidenceSource(account({ balanceMinor: 250_00 }), { balanceMinor: 250_00, source: "csv_import" })).toBe("imported_snapshot");
  });
});

function row(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    id: "txn",
    account: "Checking",
    amountMinor: -1_00,
    category: "Groceries",
    date: "2026-05-28",
    merchant: "Merchant",
    status: "reviewed",
    transferStatus: "none",
    ...overrides,
  };
}

function account(overrides: Partial<AccountRow>): AccountRow {
  return {
    id: "account",
    assetClass: "asset",
    balanceMinor: 0,
    currency: "USD",
    institution: "Manual",
    lastActivity: "Snapshot",
    mask: "0000",
    name: "Account",
    status: "active",
    type: "checking",
    ...overrides,
  };
}

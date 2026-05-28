import { defaultCategoryTree, type DefaultCategorySeed } from "./default-categories";
import type { AccountRow } from "./account-sample-data";
import type { TransactionRow } from "./transaction-sample-data";

export type CashflowCategoryFlow = "income" | "expense" | "transfer";

export type CashflowSummary = {
  inflow: number;
  outflow: number;
  excluded: number;
  byCategory: Map<string, number>;
};

export type NetWorthSummary = {
  assets: number;
  liabilities: number;
  netWorth: number;
};

export type BalanceEvidenceSource = "manual_snapshot" | "imported_snapshot" | "transaction_derived" | "missing_snapshot";

export type BalanceSnapshotEvidence = {
  balanceMinor: number;
  source: string;
};

const defaultCategoryFlowByName = buildCategoryFlowMap(defaultCategoryTree);

export function buildCashflowSummary(transactions: TransactionRow[], categoryFlowByName = defaultCategoryFlowByName): CashflowSummary {
  return transactions.reduce<CashflowSummary>(
    (summary, transaction) => {
      const flowType = getCategoryFlowType(transaction.category, categoryFlowByName);

      if (isCashflowExcluded(transaction, flowType)) {
        summary.excluded += 1;
        return summary;
      }

      if (flowType === "income") {
        if (transaction.amountMinor >= 0) {
          summary.inflow += transaction.amountMinor;
        } else {
          summary.inflow -= Math.abs(transaction.amountMinor);
        }
      } else {
        if (transaction.amountMinor < 0) {
          summary.outflow += Math.abs(transaction.amountMinor);
        } else {
          summary.outflow -= transaction.amountMinor;
        }
      }

      summary.byCategory.set(transaction.category, (summary.byCategory.get(transaction.category) ?? 0) + transaction.amountMinor);
      return summary;
    },
    { inflow: 0, outflow: 0, excluded: 0, byCategory: new Map<string, number>() },
  );
}

export function buildNetWorthSummary(accounts: AccountRow[]): NetWorthSummary {
  const summary = accounts.reduce(
    (totals, account) => {
      if (account.assetClass === "liability") {
        totals.liabilities += Math.abs(account.balanceMinor);
      } else {
        totals.assets += account.balanceMinor;
      }

      return totals;
    },
    { assets: 0, liabilities: 0 },
  );

  return {
    ...summary,
    netWorth: summary.assets - summary.liabilities,
  };
}

export function getBalanceEvidenceSource(account: AccountRow, latestSnapshot?: BalanceSnapshotEvidence | null): BalanceEvidenceSource {
  if (latestSnapshot) {
    return latestSnapshot.source === "manual" ? "manual_snapshot" : "imported_snapshot";
  }

  return account.balanceMinor === 0 ? "missing_snapshot" : "transaction_derived";
}

export function buildCategoryFlowMap(categories: DefaultCategorySeed[]) {
  const flowByName = new Map<string, CashflowCategoryFlow>();

  for (const category of categories) {
    flowByName.set(category.name, category.flowType);

    for (const child of category.children ?? []) {
      flowByName.set(child.name, child.flowType);
    }
  }

  return flowByName;
}

export function getCategoryFlowType(categoryName: string, categoryFlowByName = defaultCategoryFlowByName): CashflowCategoryFlow {
  return categoryFlowByName.get(categoryName) ?? "expense";
}

export function isCashflowExcluded(transaction: TransactionRow, flowType = getCategoryFlowType(transaction.category)) {
  return transaction.status === "excluded" || transaction.transferStatus === "transfer" || flowType === "transfer";
}

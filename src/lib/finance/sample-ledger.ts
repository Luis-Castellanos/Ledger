import { buildTransactionDedupeKey } from "./transaction";
import { normalizeRuleMatchValue } from "./rules";

/*
 * Generates a realistic, self-consistent sample ledger so a new user can see
 * every feature working before importing their own statements. Pure data
 * generation — callers (the /api/sample-data route) own the inserts. Spans
 * the most recent ~4 calendar months ending today.
 */

export type SampleAccount = {
  key: string;
  name: string;
  institution: string;
  mask: string;
  type: "checking" | "savings" | "credit_card" | "brokerage";
  assetClass: "asset" | "liability";
};

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  { key: "checking", name: "Everyday Checking", institution: "Chase", mask: "4821", type: "checking", assetClass: "asset" },
  { key: "savings", name: "High-Yield Savings", institution: "Ally", mask: "9043", type: "savings", assetClass: "asset" },
  { key: "card", name: "Sapphire Card", institution: "Chase", mask: "7711", type: "credit_card", assetClass: "liability" },
  { key: "brokerage", name: "Brokerage", institution: "Fidelity", mask: "5566", type: "brokerage", assetClass: "asset" },
];

type Recurring = {
  /* category slug from the default tree */
  category: string;
  account: "checking" | "card";
  merchants: string[];
  /* dollars, negative for spending */
  amount: [number, number];
  /* roughly how many per month */
  perMonth: number;
};

const RECURRING: Recurring[] = [
  { category: "income-payroll", account: "checking", merchants: ["Acme Corp Payroll"], amount: [4200, 4200], perMonth: 2 },
  { category: "housing-mortgage-rent", account: "checking", merchants: ["Maple Street Mortgage"], amount: [-2150, -2150], perMonth: 1 },
  { category: "housing-utilities", account: "checking", merchants: ["City Power & Water", "Comcast Xfinity"], amount: [-120, -240], perMonth: 2 },
  { category: "food-groceries", account: "card", merchants: ["Whole Foods Market", "Trader Joe's", "Costco Wholesale"], amount: [-38, -210], perMonth: 6 },
  { category: "food-restaurants", account: "card", merchants: ["Chipotle", "Sushi Ko", "The Corner Bistro"], amount: [-18, -86], perMonth: 5 },
  { category: "food-coffee", account: "card", merchants: ["Starbucks", "Blue Bottle Coffee"], amount: [-5, -12], perMonth: 8 },
  { category: "transportation-fuel", account: "card", merchants: ["Shell", "Chevron"], amount: [-42, -68], perMonth: 3 },
  { category: "lifestyle-subscriptions", account: "card", merchants: ["Netflix", "Spotify", "Notion", "iCloud+"], amount: [-3, -23], perMonth: 4 },
  { category: "lifestyle-shopping", account: "card", merchants: ["Amazon", "Target", "Uniqlo"], amount: [-24, -180], perMonth: 4 },
  { category: "transportation-insurance", account: "checking", merchants: ["Geico Auto"], amount: [-128, -128], perMonth: 1 },
];

export type GeneratedTransaction = {
  accountKey: string;
  categorySlug: string | null;
  date: string;
  amountMinor: number;
  description: string;
  transferStatus: "none" | "transfer";
  reviewStatus: "needs_review" | "reviewed";
};

export type GeneratedSnapshot = { accountKey: string; asOfDate: string; balanceMinor: number };

export type GeneratedSample = {
  transactions: GeneratedTransaction[];
  snapshots: GeneratedSnapshot[];
  budgets: { categorySlug: string; amountMinor: number }[];
  goals: { name: string; accountKey: string | null; targetAmountMinor: number; startingAmountMinor: number; manualProgressMinor: number; targetDate: string | null }[];
  rules: { name: string; matchValue: string; categorySlug: string }[];
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* tiny seeded PRNG so a sample call is varied but reproducible within a run */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function generateSampleLedger(now: Date): GeneratedSample {
  const rng = makeRng(20260611);
  const months = 4;
  const transactions: GeneratedTransaction[] = [];

  const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  for (let m = 0; m < months; m += 1) {
    const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    for (const item of RECURRING) {
      for (let i = 0; i < item.perMonth; i += 1) {
        const day = 1 + Math.floor(rng() * (daysInMonth - 1));
        const txnDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        if (txnDate > now) {
          continue;
        }
        const merchant = item.merchants[Math.floor(rng() * item.merchants.length)];
        const [lo, hi] = item.amount;
        const dollars = lo === hi ? lo : lo + rng() * (hi - lo);
        const amountMinor = Math.round(dollars * 100);
        // leave the most recent handful unreviewed so the review queue has work
        const isRecent = txnDate.getMonth() === now.getMonth();
        transactions.push({
          accountKey: item.account,
          categorySlug: isRecent && rng() < 0.4 ? null : item.category,
          date: fmtDate(txnDate),
          amountMinor,
          description: merchant.toUpperCase(),
          transferStatus: "none",
          reviewStatus: isRecent && rng() < 0.5 ? "needs_review" : "reviewed",
        });
      }
    }

    // monthly transfer checking -> savings, and a card payment
    const transferDay = Math.min(daysInMonth, 28);
    const transferDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), transferDay);
    if (transferDate <= now) {
      transactions.push({ accountKey: "checking", categorySlug: "transfers-internal", date: fmtDate(transferDate), amountMinor: -50000, description: "TRANSFER TO SAVINGS", transferStatus: "transfer", reviewStatus: "reviewed" });
      transactions.push({ accountKey: "savings", categorySlug: "transfers-internal", date: fmtDate(transferDate), amountMinor: 50000, description: "TRANSFER FROM CHECKING", transferStatus: "transfer", reviewStatus: "reviewed" });
      transactions.push({ accountKey: "checking", categorySlug: "transfers-credit-card-payment", date: fmtDate(transferDate), amountMinor: -90000, description: "CHASE CARD PAYMENT", transferStatus: "transfer", reviewStatus: "reviewed" });
      transactions.push({ accountKey: "card", categorySlug: "transfers-credit-card-payment", date: fmtDate(transferDate), amountMinor: 90000, description: "PAYMENT THANK YOU", transferStatus: "transfer", reviewStatus: "reviewed" });
    }

    // brokerage: monthly contribution + a dividend
    const investDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(daysInMonth, 5));
    if (investDate <= now) {
      transactions.push({ accountKey: "brokerage", categorySlug: null, date: fmtDate(investDate), amountMinor: 60000, description: "FIDELITY CONTRIBUTION", transferStatus: "transfer", reviewStatus: "reviewed" });
      transactions.push({ accountKey: "brokerage", categorySlug: "income-interest", date: fmtDate(investDate), amountMinor: Math.round((40 + rng() * 60) * 100), description: "DIVIDEND REINVEST", transferStatus: "none", reviewStatus: "reviewed" });
    }
  }

  // monthly balance snapshots showing growth
  const snapshots: GeneratedSnapshot[] = [];
  const baseBalances = { checking: 6200_00, savings: 18400_00, card: -1840_00, brokerage: 52600_00 };
  for (let m = 0; m < months; m += 1) {
    const snapDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + m + 1, 0);
    if (snapDate > now) {
      snapshots.push({ accountKey: "checking", asOfDate: fmtDate(now), balanceMinor: baseBalances.checking + m * 180_00 });
      snapshots.push({ accountKey: "savings", asOfDate: fmtDate(now), balanceMinor: baseBalances.savings + m * 520_00 });
      snapshots.push({ accountKey: "card", asOfDate: fmtDate(now), balanceMinor: baseBalances.card - Math.round(rng() * 400_00) });
      snapshots.push({ accountKey: "brokerage", asOfDate: fmtDate(now), balanceMinor: baseBalances.brokerage + m * 1100_00 });
      continue;
    }
    snapshots.push({ accountKey: "checking", asOfDate: fmtDate(snapDate), balanceMinor: baseBalances.checking + m * 180_00 });
    snapshots.push({ accountKey: "savings", asOfDate: fmtDate(snapDate), balanceMinor: baseBalances.savings + m * 520_00 });
    snapshots.push({ accountKey: "card", asOfDate: fmtDate(snapDate), balanceMinor: baseBalances.card - Math.round(rng() * 400_00) });
    snapshots.push({ accountKey: "brokerage", asOfDate: fmtDate(snapDate), balanceMinor: baseBalances.brokerage + m * 1100_00 });
  }

  const goalDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);

  return {
    transactions,
    snapshots,
    budgets: [
      { categorySlug: "food-groceries", amountMinor: 600_00 },
      { categorySlug: "food-restaurants", amountMinor: 300_00 },
      { categorySlug: "food-coffee", amountMinor: 80_00 },
      { categorySlug: "lifestyle-shopping", amountMinor: 250_00 },
      { categorySlug: "transportation-fuel", amountMinor: 180_00 },
    ],
    goals: [
      { name: "Emergency Fund", accountKey: "savings", targetAmountMinor: 25000_00, startingAmountMinor: 18400_00, manualProgressMinor: 0, targetDate: fmtDate(goalDate) },
      { name: "Japan Trip", accountKey: null, targetAmountMinor: 5000_00, startingAmountMinor: 0, manualProgressMinor: 1850_00, targetDate: fmtDate(goalDate) },
    ],
    rules: [
      { name: "Starbucks → Coffee", matchValue: "STARBUCKS", categorySlug: "food-coffee" },
      { name: "Whole Foods → Groceries", matchValue: "WHOLE FOODS", categorySlug: "food-groceries" },
      { name: "Netflix → Subscriptions", matchValue: "NETFLIX", categorySlug: "lifestyle-subscriptions" },
    ],
  };
}

export function sampleDedupeKey(input: { ledgerId: string; accountId: string; date: string; amountMinor: number; description: string }) {
  return buildTransactionDedupeKey({
    ledgerId: input.ledgerId,
    accountId: input.accountId,
    date: input.date,
    amountMinor: input.amountMinor,
    rawDescription: input.description,
  });
}

export { normalizeRuleMatchValue };

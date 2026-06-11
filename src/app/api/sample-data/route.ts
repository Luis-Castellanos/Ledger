import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, balanceSnapshots, budgets, categories, goals, merchantRules, transactions } from "@/lib/db/schema";
import { budgetMonthBounds } from "@/lib/finance/budget";
import { generateSampleLedger, normalizeRuleMatchValue, sampleDedupeKey, SAMPLE_ACCOUNTS } from "@/lib/finance/sample-ledger";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function GET() {
  const context = await getOrCreateCurrentLedger();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.ledgerId, context.ledger.id), isNull(transactions.deletedAt)));

  return NextResponse.json({ data: { hasData: Number(count) > 0, transactionCount: Number(count) } });
}

export async function DELETE() {
  const context = await getOrCreateCurrentLedger();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "sample-data");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const db = getDb();
  const ledgerId = context.ledger.id;
  const now = new Date();

  // soft-delete financial records (keeps the category taxonomy intact);
  // snapshots carry no deletedAt column, so they're removed outright
  await db.delete(balanceSnapshots).where(eq(balanceSnapshots.ledgerId, ledgerId));
  await db.update(transactions).set({ deletedAt: now, updatedAt: now }).where(and(eq(transactions.ledgerId, ledgerId), isNull(transactions.deletedAt)));
  await db.update(budgets).set({ deletedAt: now, updatedAt: now }).where(and(eq(budgets.ledgerId, ledgerId), isNull(budgets.deletedAt)));
  await db.update(goals).set({ deletedAt: now, updatedAt: now }).where(and(eq(goals.ledgerId, ledgerId), isNull(goals.deletedAt)));
  await db.update(merchantRules).set({ deletedAt: now, updatedAt: now }).where(and(eq(merchantRules.ledgerId, ledgerId), isNull(merchantRules.deletedAt)));
  await db.update(accounts).set({ deletedAt: now, updatedAt: now }).where(and(eq(accounts.ledgerId, ledgerId), isNull(accounts.deletedAt)));

  await db.insert(auditEvents).values({
    ledgerId,
    actorUserId: context.user.id,
    action: "ledger.reset",
    entityType: "ledger",
    entityId: ledgerId,
  });

  return NextResponse.json({ data: { reset: true } });
}

export async function POST() {
  const context = await getOrCreateCurrentLedger();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "sample-data");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const db = getDb();
  const ledgerId = context.ledger.id;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.ledgerId, ledgerId), isNull(transactions.deletedAt)));

  if (Number(count) > 0) {
    return NextResponse.json(
      { error: "Your ledger already has transactions. Sample data can only be loaded into an empty ledger." },
      { status: 409 },
    );
  }

  const sample = generateSampleLedger(new Date());

  // accounts
  const insertedAccounts = await db
    .insert(accounts)
    .values(
      SAMPLE_ACCOUNTS.map((account, index) => ({
        ledgerId,
        name: account.name,
        institution: account.institution,
        mask: account.mask,
        type: account.type,
        assetClass: account.assetClass,
        currency: "USD",
        sortOrder: index,
      })),
    )
    .returning({ id: accounts.id, name: accounts.name });

  const accountIdByKey = new Map<string, string>();
  SAMPLE_ACCOUNTS.forEach((account, index) => accountIdByKey.set(account.key, insertedAccounts[index].id));

  // category slug -> id (seeded when the ledger was created)
  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.ledgerId, ledgerId), isNull(categories.deletedAt)));
  const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // transactions
  if (sample.transactions.length > 0) {
    await db.insert(transactions).values(
      sample.transactions.map((txn) => {
        const accountId = accountIdByKey.get(txn.accountKey)!;
        return {
          ledgerId,
          accountId,
          categoryId: txn.categorySlug ? (categoryIdBySlug.get(txn.categorySlug) ?? null) : null,
          date: txn.date,
          amountMinor: txn.amountMinor,
          currency: "USD",
          rawDescription: txn.description,
          displayName: txn.description,
          source: "import" as const,
          reviewStatus: txn.reviewStatus,
          transferStatus: txn.transferStatus,
          dedupeKey: sampleDedupeKey({ ledgerId, accountId, date: txn.date, amountMinor: txn.amountMinor, description: txn.description }),
        };
      }),
    );
  }

  // balance snapshots
  if (sample.snapshots.length > 0) {
    await db
      .insert(balanceSnapshots)
      .values(
        sample.snapshots.map((snap) => ({
          ledgerId,
          accountId: accountIdByKey.get(snap.accountKey)!,
          asOfDate: snap.asOfDate,
          balanceMinor: snap.balanceMinor,
          currency: "USD",
          source: "import" as const,
        })),
      )
      .onConflictDoNothing();
  }

  // budgets for the current month
  const month = new Date().toISOString().slice(0, 7);
  const { start } = budgetMonthBounds(month);
  const budgetValues = sample.budgets
    .map((budget) => ({ categoryId: categoryIdBySlug.get(budget.categorySlug), amountMinor: budget.amountMinor }))
    .filter((budget): budget is { categoryId: string; amountMinor: number } => Boolean(budget.categoryId))
    .map((budget) => ({ ledgerId, categoryId: budget.categoryId, month: start, amountMinor: budget.amountMinor, currency: "USD" }));
  if (budgetValues.length > 0) {
    await db.insert(budgets).values(budgetValues).onConflictDoNothing();
  }

  // goals
  if (sample.goals.length > 0) {
    await db.insert(goals).values(
      sample.goals.map((goal, index) => ({
        ledgerId,
        accountId: goal.accountKey ? (accountIdByKey.get(goal.accountKey) ?? null) : null,
        name: goal.name,
        targetAmountMinor: goal.targetAmountMinor,
        startingAmountMinor: goal.startingAmountMinor,
        manualProgressMinor: goal.manualProgressMinor,
        currency: "USD",
        targetDate: goal.targetDate,
        sortOrder: index,
      })),
    );
  }

  // merchant rules
  const ruleValues = sample.rules
    .map((rule) => ({ ...rule, categoryId: categoryIdBySlug.get(rule.categorySlug) }))
    .filter((rule): rule is typeof rule & { categoryId: string } => Boolean(rule.categoryId))
    .map((rule, index) => ({
      ledgerId,
      categoryId: rule.categoryId,
      name: rule.name,
      matchType: "contains",
      matchValue: rule.matchValue,
      normalizedMatchValue: normalizeRuleMatchValue(rule.matchValue),
      priority: 100 + index,
      isActive: true,
    }));
  if (ruleValues.length > 0) {
    await db.insert(merchantRules).values(ruleValues);
  }

  await db.insert(auditEvents).values({
    ledgerId,
    actorUserId: context.user.id,
    action: "ledger.sample_data_loaded",
    entityType: "ledger",
    entityId: ledgerId,
    metadata: {
      accounts: insertedAccounts.length,
      transactions: sample.transactions.length,
      budgets: budgetValues.length,
      goals: sample.goals.length,
    },
  });

  return NextResponse.json({
    data: {
      accounts: insertedAccounts.length,
      transactions: sample.transactions.length,
      snapshots: sample.snapshots.length,
      budgets: budgetValues.length,
      goals: sample.goals.length,
      rules: ruleValues.length,
    },
  });
}

import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, merchantRules, transactions } from "@/lib/db/schema";
import { findMatchingMerchantRule } from "@/lib/finance/rules";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function POST() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "merchant-rules-apply");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const db = getDb();
  const rules = await db
    .select({
      accountId: merchantRules.accountId,
      categoryId: merchantRules.categoryId,
      matchType: merchantRules.matchType,
      normalizedMatchValue: merchantRules.normalizedMatchValue,
    })
    .from(merchantRules)
    .where(and(eq(merchantRules.ledgerId, context.ledger.id), eq(merchantRules.isActive, true), isNull(merchantRules.deletedAt)))
    .orderBy(asc(merchantRules.priority), asc(merchantRules.name));

  if (rules.length === 0) {
    return NextResponse.json({ appliedCount: 0 });
  }

  const candidates = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      rawDescription: transactions.rawDescription,
      displayName: transactions.displayName,
    })
    .from(transactions)
    .where(and(eq(transactions.ledgerId, context.ledger.id), eq(transactions.reviewStatus, "needs_review"), isNull(transactions.deletedAt)))
    .limit(1_000);

  let appliedCount = 0;

  for (const transaction of candidates) {
    const rule = findMatchingMerchantRule(transaction.rawDescription || transaction.displayName, rules, transaction.accountId);

    if (!rule || transaction.categoryId === rule.categoryId) {
      continue;
    }

    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        categoryId: rule.categoryId,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, transaction.id), eq(transactions.ledgerId, context.ledger.id), eq(transactions.reviewStatus, "needs_review"), isNull(transactions.deletedAt)))
      .returning();

    if (!updatedTransaction) {
      continue;
    }

    await db.insert(auditEvents).values({
      ledgerId: context.ledger.id,
      actorUserId: context.user.id,
      action: "merchant_rule.applied",
      entityType: "transaction",
      entityId: updatedTransaction.id,
      before: transaction,
      after: updatedTransaction,
    });

    appliedCount += 1;
  }

  return NextResponse.json({ appliedCount });
}

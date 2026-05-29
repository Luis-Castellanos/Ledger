import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, merchantRules, transactions } from "@/lib/db/schema";
import { normalizeRuleMatchValue } from "@/lib/finance/rules";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function POST() {
  const current = await getOrCreateCurrentLedger();

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(current.user.id, "transactions-reclean");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const db = getDb();
  const [rules, rows] = await Promise.all([
    db
      .select()
      .from(merchantRules)
      .where(and(eq(merchantRules.ledgerId, current.ledger.id), eq(merchantRules.isActive, true), isNull(merchantRules.deletedAt))),
    db.select().from(transactions).where(and(eq(transactions.ledgerId, current.ledger.id), isNull(transactions.deletedAt))),
  ]);

  let updated = 0;
  for (const row of rows) {
    const normalized = normalizeRuleMatchValue(row.displayName || row.rawDescription);
    const rule = rules
      .filter((candidate) => matchesRule(normalized, candidate.matchType, candidate.normalizedMatchValue))
      .sort((left, right) => left.priority - right.priority)[0];

    if (!rule || row.categoryId === rule.categoryId) {
      continue;
    }

    await db
      .update(transactions)
      .set({ categoryId: rule.categoryId, reviewStatus: "reviewed", updatedAt: new Date() })
      .where(and(eq(transactions.id, row.id), eq(transactions.ledgerId, current.ledger.id)));
    updated += 1;
  }

  await db.insert(auditEvents).values({
    ledgerId: current.ledger.id,
    actorUserId: current.user.id,
    action: "transactions.recleaned",
    entityType: "transaction",
    metadata: { updated },
  });

  return NextResponse.json({ data: { updated }, updated });
}

function matchesRule(value: string, matchType: string, matchValue: string) {
  if (matchType === "exact") {
    return value === matchValue;
  }
  if (matchType === "starts_with") {
    return value.startsWith(matchValue);
  }
  return value.includes(matchValue);
}

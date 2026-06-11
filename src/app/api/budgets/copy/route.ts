import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, budgets } from "@/lib/db/schema";
import { budgetMonthBounds, copyBudgetsSchema } from "@/lib/finance/budget";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "budgets");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, copyBudgetsSchema, "budget copy");
  if (!parsed.ok) {
    return parsed.response;
  }

  const fromStart = budgetMonthBounds(parsed.data.fromMonth).start;
  const toStart = budgetMonthBounds(parsed.data.toMonth).start;
  const db = getDb();

  const [source, existing] = await Promise.all([
    db
      .select()
      .from(budgets)
      .where(and(eq(budgets.ledgerId, context.ledger.id), eq(budgets.month, fromStart), isNull(budgets.deletedAt))),
    db
      .select({ categoryId: budgets.categoryId })
      .from(budgets)
      .where(and(eq(budgets.ledgerId, context.ledger.id), eq(budgets.month, toStart), isNull(budgets.deletedAt))),
  ]);

  const alreadyBudgeted = new Set(existing.map((row) => row.categoryId));
  const toInsert = source.filter((row) => !alreadyBudgeted.has(row.categoryId));

  if (toInsert.length === 0) {
    return NextResponse.json({ data: { copied: 0 }, copied: 0 });
  }

  const inserted = await db
    .insert(budgets)
    .values(
      toInsert.map((row) => ({
        ledgerId: context.ledger.id,
        categoryId: row.categoryId,
        month: toStart,
        amountMinor: row.amountMinor,
        currency: row.currency,
        notes: row.notes,
      })),
    )
    .returning({ id: budgets.id });

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "budget.copied",
    entityType: "budget",
    metadata: { fromMonth: parsed.data.fromMonth, toMonth: parsed.data.toMonth, copied: inserted.length },
  });

  return NextResponse.json({ data: { copied: inserted.length }, copied: inserted.length });
}

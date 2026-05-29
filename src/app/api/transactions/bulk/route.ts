import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, categories, transactions } from "@/lib/db/schema";
import { transactionStatusSchema, transactionTransferStatusSchema } from "@/lib/finance/transaction";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(2000),
  categoryId: z.string().uuid().nullable().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  isTransfer: z.boolean().optional(),
  transferStatus: transactionTransferStatusSchema.optional(),
  needsReview: z.boolean().optional(),
  reviewStatus: transactionStatusSchema.optional(),
});

export async function POST(request: NextRequest) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "transactions-bulk");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, bodySchema, "bulk transaction update");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const body = parsed.data;
  let categoryId = body.categoryId;

  if (body.categoryName) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.ledgerId, context.ledger.id), eq(categories.name, body.categoryName), isNull(categories.deletedAt)))
      .limit(1);
    categoryId = category?.id ?? null;
  }

  const reviewStatus = body.reviewStatus ?? (body.needsReview === undefined ? undefined : body.needsReview ? "needs_review" : "reviewed");
  const transferStatus = body.transferStatus ?? (body.isTransfer === undefined ? undefined : body.isTransfer ? "transfer" : "none");
  const update = {
    ...(body.categoryId !== undefined || body.categoryName ? { categoryId } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
    ...(transferStatus ? { transferStatus } : {}),
    updatedAt: new Date(),
  };

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No changes specified" }, { status: 400 });
  }

  const existing = await db.select().from(transactions).where(and(eq(transactions.ledgerId, context.ledger.id), inArray(transactions.id, body.ids)));
  const updated = await db
    .update(transactions)
    .set(update)
    .where(and(eq(transactions.ledgerId, context.ledger.id), isNull(transactions.deletedAt), inArray(transactions.id, body.ids)))
    .returning({ id: transactions.id });

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "transaction.bulk_updated",
    entityType: "transaction",
    before: { ids: existing.map((row) => row.id) },
    after: { ids: updated.map((row) => row.id), update },
    metadata: { requested: body.ids.length, updated: updated.length },
  });

  return NextResponse.json({ data: { updated: updated.length, applied: updated }, updated: updated.length, applied: updated });
}

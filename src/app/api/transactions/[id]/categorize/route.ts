import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, categories, transactions } from "@/lib/db/schema";
import { merchantPrefix } from "@/lib/finance/merchant";
import { transactionTransferStatusSchema } from "@/lib/finance/transaction";
import { parseJsonRequest } from "@/lib/http/request";

const bodySchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  applyToSimilar: z.boolean().default(false),
  isTransfer: z.boolean().optional(),
  transferStatus: transactionTransferStatusSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const current = await getOrCreateCurrentLedger();

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = await parseJsonRequest(request, bodySchema, "categorize request");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.ledgerId, current.ledger.id), isNull(transactions.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  let categoryId = parsed.data.categoryId;
  if (parsed.data.categoryName) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.ledgerId, current.ledger.id), eq(categories.name, parsed.data.categoryName), isNull(categories.deletedAt)))
      .limit(1);
    categoryId = category?.id ?? null;
  }

  if (categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.ledgerId, current.ledger.id), isNull(categories.deletedAt)))
      .limit(1);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  const transferStatus = parsed.data.transferStatus ?? (parsed.data.isTransfer === undefined ? undefined : parsed.data.isTransfer ? "transfer" : "none");
  const update = {
    categoryId: categoryId ?? null,
    reviewStatus: "reviewed" as const,
    ...(transferStatus ? { transferStatus } : {}),
    ...(parsed.data.tags ? { tags: parsed.data.tags } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    updatedAt: new Date(),
  };

  const [transaction] = await db.update(transactions).set(update).where(eq(transactions.id, id)).returning();
  const applied: { id: string }[] = [{ id }];

  if (parsed.data.applyToSimilar) {
    const prefix = merchantPrefix(existing.rawDescription);
    if (prefix) {
      const updated = await db
        .update(transactions)
        .set({ categoryId: categoryId ?? null, reviewStatus: "reviewed", ...(transferStatus ? { transferStatus } : {}), updatedAt: new Date() })
        .where(
          and(
            eq(transactions.ledgerId, current.ledger.id),
            isNull(transactions.deletedAt),
            eq(transactions.reviewStatus, "needs_review"),
            ne(transactions.id, id),
            sql`${transactions.rawDescription} ILIKE ${prefix + "%"}`,
          ),
        )
        .returning({ id: transactions.id });
      applied.push(...updated);
    }
  }

  await db.insert(auditEvents).values({
    ledgerId: current.ledger.id,
    actorUserId: current.user.id,
    action: "transaction.categorized",
    entityType: "transaction",
    entityId: id,
    before: existing,
    after: transaction,
    metadata: { applied: applied.length },
  });

  return NextResponse.json({ data: { updated: applied.length, applied }, transaction, updated: applied.length, applied });
}

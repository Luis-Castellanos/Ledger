import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, transactions } from "@/lib/db/schema";
import { merchantPrefix } from "@/lib/finance/merchant";
import { parseDollarAmount } from "@/lib/finance/money";
import { transactionStatusSchema, transactionTransferStatusSchema } from "@/lib/finance/transaction";

const bodySchema = z.object({
  merchant: z.string().trim().min(1).max(240).optional(),
  accountId: z.string().uuid().optional(),
  date: z.string().date().optional(),
  amount: z
    .string()
    .trim()
    .min(1)
    .transform((value, issue) => {
      try {
        return parseDollarAmount(value);
      } catch {
        issue.addIssue({ code: "custom", message: "Enter a valid signed dollar amount." });
        return z.NEVER;
      }
    })
    .optional(),
  isTransfer: z.boolean().optional(),
  transferStatus: transactionTransferStatusSchema.optional(),
  needsReview: z.boolean().optional(),
  reviewStatus: transactionStatusSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  notes: z.string().max(2000).optional(),
  applyMerchantToSimilar: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const current = await getOrCreateCurrentLedger();

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction update", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
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

  if (parsed.data.accountId) {
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.ledgerId, current.ledger.id), isNull(accounts.deletedAt)))
      .limit(1);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
  }

  const reviewStatus = parsed.data.reviewStatus ?? (parsed.data.needsReview === undefined ? undefined : parsed.data.needsReview ? "needs_review" : "reviewed");
  const transferStatus = parsed.data.transferStatus ?? (parsed.data.isTransfer === undefined ? undefined : parsed.data.isTransfer ? "transfer" : "none");
  const update = {
    ...(parsed.data.merchant ? { rawDescription: parsed.data.merchant, displayName: parsed.data.merchant } : {}),
    ...(parsed.data.accountId ? { accountId: parsed.data.accountId } : {}),
    ...(parsed.data.date ? { date: parsed.data.date } : {}),
    ...(parsed.data.amount !== undefined ? { amountMinor: parsed.data.amount } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
    ...(transferStatus ? { transferStatus } : {}),
    ...(parsed.data.tags ? { tags: parsed.data.tags } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    updatedAt: new Date(),
  };

  const [transaction] = await db
    .update(transactions)
    .set(update)
    .where(and(eq(transactions.id, id), eq(transactions.ledgerId, current.ledger.id)))
    .returning();

  const applied: { id: string }[] = [{ id }];

  if (parsed.data.merchant && parsed.data.applyMerchantToSimilar) {
    const prefix = merchantPrefix(existing.rawDescription);
    if (prefix) {
      const others = await db
        .update(transactions)
        .set({ rawDescription: parsed.data.merchant, displayName: parsed.data.merchant, updatedAt: new Date() })
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
      applied.push(...others);
    }
  }

  await db.insert(auditEvents).values({
    ledgerId: current.ledger.id,
    actorUserId: current.user.id,
    action: "transaction.updated",
    entityType: "transaction",
    entityId: transaction.id,
    before: existing,
    after: transaction,
    metadata: { applied: applied.length },
  });

  return NextResponse.json({ data: { updated: applied.length, applied }, transaction, updated: applied.length, applied });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const current = await getOrCreateCurrentLedger();

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.ledgerId, current.ledger.id), isNull(transactions.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const [transaction] = await db.update(transactions).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(transactions.id, id)).returning();

  await db.insert(auditEvents).values({
    ledgerId: current.ledger.id,
    actorUserId: current.user.id,
    action: "transaction.deleted",
    entityType: "transaction",
    entityId: id,
    before: existing,
    after: transaction,
  });

  return NextResponse.json({ data: { deleted: 1 }, deleted: 1 });
}

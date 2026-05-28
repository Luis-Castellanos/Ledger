import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, categories, transactions } from "@/lib/db/schema";
import { createManualTransactionSchema, updateTransactionReviewSchema } from "@/lib/finance/transaction";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      account: accounts.name,
      amountMinor: transactions.amountMinor,
      category: categories.name,
      merchant: transactions.displayName,
      notes: transactions.notes,
      status: transactions.reviewStatus,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.ledgerId, context.ledger.id), isNull(transactions.deletedAt)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(100);

  return NextResponse.json({
    transactions: rows.map((row) => ({
      ...row,
      category: row.category ?? "Uncategorized",
    })),
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createManualTransactionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const [account] = await db
    .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const [category] = parsed.data.categoryName
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(and(eq(categories.ledgerId, context.ledger.id), eq(categories.name, parsed.data.categoryName), isNull(categories.deletedAt)))
        .limit(1)
    : [];

  const normalizedMerchant = parsed.data.merchant.toLowerCase().replace(/\s+/g, " ").trim();
  const dedupeKey = ["manual", parsed.data.accountId, parsed.data.date, parsed.data.amount, normalizedMerchant, Date.now()].join(":");

  const [transaction] = await db
    .insert(transactions)
    .values({
      ledgerId: context.ledger.id,
      accountId: parsed.data.accountId,
      categoryId: category?.id,
      date: parsed.data.date,
      amountMinor: parsed.data.amount,
      currency: account.currency,
      rawDescription: parsed.data.merchant,
      displayName: parsed.data.merchant,
      notes: parsed.data.notes,
      source: "manual",
      reviewStatus: "needs_review",
      dedupeKey,
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "transaction.created",
    entityType: "transaction",
    entityId: transaction.id,
    after: transaction,
  });

  return NextResponse.json(
    {
      transaction: {
        id: transaction.id,
        date: transaction.date,
        merchant: transaction.displayName,
        account: account.name,
        category: category?.name ?? "Uncategorized",
        amountMinor: transaction.amountMinor,
        notes: transaction.notes,
        status: transaction.reviewStatus,
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateTransactionReviewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction update", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const isLifecycleAction = parsed.data.action === "delete" || parsed.data.action === "restore";
  const [existingTransaction] = await db
    .select()
    .from(transactions)
    .where(
      isLifecycleAction
        ? and(eq(transactions.id, parsed.data.id), eq(transactions.ledgerId, context.ledger.id))
        : and(eq(transactions.id, parsed.data.id), eq(transactions.ledgerId, context.ledger.id), isNull(transactions.deletedAt)),
    )
    .limit(1);

  if (!existingTransaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (parsed.data.action) {
    const nextDeletedAt = parsed.data.action === "delete" ? new Date() : null;
    const [transaction] = await db
      .update(transactions)
      .set({
        deletedAt: nextDeletedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, parsed.data.id), eq(transactions.ledgerId, context.ledger.id)))
      .returning();

    await db.insert(auditEvents).values({
      ledgerId: context.ledger.id,
      actorUserId: context.user.id,
      action: parsed.data.action === "delete" ? "transaction.deleted" : "transaction.restored",
      entityType: "transaction",
      entityId: transaction.id,
      before: existingTransaction,
      after: transaction,
    });

    return NextResponse.json({ transaction });
  }

  const [category] = parsed.data.categoryName
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(and(eq(categories.ledgerId, context.ledger.id), eq(categories.name, parsed.data.categoryName), isNull(categories.deletedAt)))
        .limit(1)
    : [];

  const [transaction] = await db
    .update(transactions)
    .set({
      reviewStatus: parsed.data.reviewStatus,
      categoryId: parsed.data.categoryName ? category?.id ?? null : existingTransaction.categoryId,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, parsed.data.id), eq(transactions.ledgerId, context.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "transaction.updated",
    entityType: "transaction",
    entityId: transaction.id,
    before: existingTransaction,
    after: transaction,
  });

  return NextResponse.json({ transaction });
}

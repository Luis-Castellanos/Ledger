import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, gt, gte, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, categories, transactions } from "@/lib/db/schema";
import {
  buildTransactionDedupeKey,
  buildUpdatedTransactionDedupeKey,
  createManualTransactionApiSchema,
  decodeTransactionCursor,
  encodeTransactionCursor,
  transactionListQuerySchema,
  updateTransactionReviewSchema,
  type TransactionCursor,
  type TransactionSort,
} from "@/lib/finance/transaction";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

function cursorCondition(sort: TransactionSort, cursor: TransactionCursor): SQL | undefined {
  switch (sort) {
    case "date_desc":
    case "date_asc": {
      if (typeof cursor.v !== "string" || !cursor.c) {
        return undefined;
      }
      const createdAt = new Date(cursor.c);
      if (Number.isNaN(createdAt.getTime())) {
        return undefined;
      }
      const [primary, secondary, tiebreak] =
        sort === "date_desc"
          ? [lt(transactions.date, cursor.v), lt(transactions.createdAt, createdAt), lt(transactions.id, cursor.id)]
          : [gt(transactions.date, cursor.v), gt(transactions.createdAt, createdAt), gt(transactions.id, cursor.id)];
      return or(
        primary,
        and(eq(transactions.date, cursor.v), secondary),
        and(eq(transactions.date, cursor.v), eq(transactions.createdAt, createdAt), tiebreak),
      );
    }
    case "amount_desc":
    case "amount_asc": {
      if (typeof cursor.v !== "number") {
        return undefined;
      }
      const [primary, tiebreak] =
        sort === "amount_desc"
          ? [lt(transactions.amountMinor, cursor.v), lt(transactions.id, cursor.id)]
          : [gt(transactions.amountMinor, cursor.v), gt(transactions.id, cursor.id)];
      return or(primary, and(eq(transactions.amountMinor, cursor.v), tiebreak));
    }
    case "merchant_asc":
    case "merchant_desc": {
      if (typeof cursor.v !== "string") {
        return undefined;
      }
      const [primary, tiebreak] =
        sort === "merchant_desc"
          ? [lt(transactions.displayName, cursor.v), lt(transactions.id, cursor.id)]
          : [gt(transactions.displayName, cursor.v), gt(transactions.id, cursor.id)];
      return or(primary, and(eq(transactions.displayName, cursor.v), tiebreak));
    }
  }
}

function sortOrder(sort: TransactionSort): SQL[] {
  switch (sort) {
    case "date_desc":
      return [desc(transactions.date), desc(transactions.createdAt), desc(transactions.id)];
    case "date_asc":
      return [asc(transactions.date), asc(transactions.createdAt), asc(transactions.id)];
    case "amount_desc":
      return [desc(transactions.amountMinor), desc(transactions.id)];
    case "amount_asc":
      return [asc(transactions.amountMinor), asc(transactions.id)];
    case "merchant_asc":
      return [asc(transactions.displayName), asc(transactions.id)];
    case "merchant_desc":
      return [desc(transactions.displayName), desc(transactions.id)];
  }
}

function rowCursor(sort: TransactionSort, row: { date: string; createdAt: Date; amountMinor: number; merchant: string; id: string }): TransactionCursor {
  switch (sort) {
    case "date_desc":
    case "date_asc":
      return { v: row.date, c: row.createdAt.toISOString(), id: row.id };
    case "amount_desc":
    case "amount_asc":
      return { v: row.amountMinor, id: row.id };
    case "merchant_asc":
    case "merchant_desc":
      return { v: row.merchant, id: row.id };
  }
}

export async function GET(request: NextRequest) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = transactionListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!params.success) {
    return NextResponse.json({ error: "Invalid transactions query", issues: params.error.flatten().fieldErrors }, { status: 400 });
  }

  const query = params.data;
  const conditions: (SQL | undefined)[] = [
    eq(transactions.ledgerId, context.ledger.id),
    isNull(transactions.deletedAt),
  ];

  if (query.q) {
    const needle = `%${query.q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    conditions.push(
      or(
        sql`${transactions.displayName} ILIKE ${needle}`,
        sql`${transactions.rawDescription} ILIKE ${needle}`,
        sql`${transactions.notes} ILIKE ${needle}`,
      ),
    );
  }
  if (query.accountId) {
    conditions.push(eq(transactions.accountId, query.accountId));
  }
  if (query.categoryId) {
    conditions.push(eq(transactions.categoryId, query.categoryId));
  } else if (query.uncategorized) {
    conditions.push(isNull(transactions.categoryId));
  }
  if (query.status) {
    conditions.push(eq(transactions.reviewStatus, query.status));
  }
  if (query.transfer) {
    conditions.push(eq(transactions.transferStatus, query.transfer));
  }
  if (query.direction) {
    conditions.push(query.direction === "inflow" ? gt(transactions.amountMinor, 0) : lt(transactions.amountMinor, 0));
  }
  if (query.from) {
    conditions.push(gte(transactions.date, query.from));
  }
  if (query.to) {
    conditions.push(lte(transactions.date, query.to));
  }
  if (query.tag) {
    conditions.push(sql`${query.tag} = ANY(${transactions.tags})`);
  }

  const filterClause = and(...conditions);
  const db = getDb();

  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(filterClause);

  const pageConditions: (SQL | undefined)[] = [filterClause];
  if (query.cursor) {
    const cursor = decodeTransactionCursor(query.cursor);
    if (!cursor) {
      return NextResponse.json({ error: "Invalid transactions cursor" }, { status: 400 });
    }
    pageConditions.push(cursorCondition(query.sort, cursor));
  }

  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      createdAt: transactions.createdAt,
      account: accounts.name,
      accountId: transactions.accountId,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      category: categories.name,
      categoryId: transactions.categoryId,
      merchant: transactions.displayName,
      rawDescription: transactions.rawDescription,
      notes: transactions.notes,
      status: transactions.reviewStatus,
      tags: transactions.tags,
      transferStatus: transactions.transferStatus,
    })
    .from(transactions)
    .innerJoin(accounts, and(eq(transactions.accountId, accounts.id), eq(accounts.ledgerId, context.ledger.id)))
    .leftJoin(categories, and(eq(transactions.categoryId, categories.id), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .where(and(...pageConditions))
    .orderBy(...sortOrder(query.sort))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const lastRow = page[page.length - 1];
  const nextCursor = hasMore && lastRow ? encodeTransactionCursor(rowCursor(query.sort, lastRow)) : null;

  return NextResponse.json({
    transactions: page.map(({ createdAt, ...row }) => {
      void createdAt;
      return {
        ...row,
        category: row.category ?? "Uncategorized",
        tags: row.tags ?? [],
      };
    }),
    nextCursor,
    totalCount: Number(totalCount),
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "transactions");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, createManualTransactionApiSchema, "transaction");
  if (!parsed.ok) {
    return parsed.response;
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

  const dedupeKey = buildTransactionDedupeKey({
    ledgerId: context.ledger.id,
    accountId: parsed.data.accountId,
    date: parsed.data.date,
    amountMinor: parsed.data.amount,
    rawDescription: parsed.data.merchant,
  });

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
      tags: parsed.data.tags,
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
        tags: transaction.tags ?? [],
        transferStatus: transaction.transferStatus,
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

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "transactions");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, updateTransactionReviewSchema, "transaction update");
  if (!parsed.ok) {
    return parsed.response;
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

  const [category] = parsed.data.categoryId
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(and(eq(categories.ledgerId, context.ledger.id), eq(categories.id, parsed.data.categoryId), isNull(categories.deletedAt)))
        .limit(1)
    : parsed.data.categoryName
      ? await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(and(eq(categories.ledgerId, context.ledger.id), eq(categories.name, parsed.data.categoryName), isNull(categories.deletedAt)))
          .limit(1)
      : [];

  if (parsed.data.categoryId && !category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const identityChanged = parsed.data.date !== undefined || parsed.data.merchant !== undefined || parsed.data.amount !== undefined;

  const transactionUpdate = {
    ...(parsed.data.date ? { date: parsed.data.date } : {}),
    ...(parsed.data.merchant ? { rawDescription: parsed.data.merchant, displayName: parsed.data.merchant } : {}),
    ...(parsed.data.amount !== undefined ? { amountMinor: parsed.data.amount } : {}),
    ...(identityChanged
      ? {
          dedupeKey: buildUpdatedTransactionDedupeKey(
            {
              ledgerId: existingTransaction.ledgerId,
              accountId: existingTransaction.accountId,
              date: existingTransaction.date,
              amountMinor: existingTransaction.amountMinor,
              rawDescription: existingTransaction.rawDescription,
            },
            {
              date: parsed.data.date,
              rawDescription: parsed.data.merchant,
              amountMinor: parsed.data.amount,
            },
          ),
        }
      : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    ...(parsed.data.reviewStatus ? { reviewStatus: parsed.data.reviewStatus } : {}),
    ...(parsed.data.transferStatus ? { transferStatus: parsed.data.transferStatus } : {}),
    ...(parsed.data.categoryId !== undefined
      ? { categoryId: parsed.data.categoryId === null ? null : (category?.id ?? null) }
      : parsed.data.categoryName
        ? { categoryId: category?.id ?? null }
        : {}),
    ...(parsed.data.tags ? { tags: parsed.data.tags } : {}),
    updatedAt: new Date(),
  };

  const [transaction] = await db
    .update(transactions)
    .set(transactionUpdate)
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

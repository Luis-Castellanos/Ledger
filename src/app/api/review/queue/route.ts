import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, isNull, ne, not, sql } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, categories, transactions } from "@/lib/db/schema";
import { merchantPrefix } from "@/lib/finance/merchant";

const querySchema = z.object({
  skip: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: NextRequest) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!params.success) {
    return NextResponse.json({ error: "Invalid review query", issues: params.error.flatten().fieldErrors }, { status: 400 });
  }

  const skipIds = params.data.skip ? params.data.skip.split(",").filter(Boolean) : [];
  const skipClause = skipIds.length ? not(inArray(transactions.id, skipIds)) : undefined;
  const db = getDb();

  const [{ count: remainingRaw }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.ledgerId, context.ledger.id), eq(transactions.reviewStatus, "needs_review"), isNull(transactions.deletedAt), skipClause));
  const remaining = Number(remainingRaw);

  if (remaining === 0) {
    return NextResponse.json({ data: { remaining: 0, transaction: null, similar: [], suggestedCategory: null } });
  }

  const [txn] = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountMinor: transactions.amountMinor,
      merchant: transactions.displayName,
      rawDescription: transactions.rawDescription,
      transferStatus: transactions.transferStatus,
      tags: transactions.tags,
      notes: transactions.notes,
      account: {
        id: accounts.id,
        displayName: accounts.name,
        type: accounts.type,
      },
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.ledgerId, context.ledger.id), eq(transactions.reviewStatus, "needs_review"), isNull(transactions.deletedAt), skipClause))
    .orderBy(asc(transactions.date), asc(transactions.createdAt))
    .limit(1);

  if (!txn) {
    return NextResponse.json({ data: { remaining, transaction: null, similar: [], suggestedCategory: null } });
  }

  const prefix = merchantPrefix(txn.rawDescription || txn.merchant);
  const similar = prefix
    ? await db
        .select({
          id: transactions.id,
          date: transactions.date,
          amountMinor: transactions.amountMinor,
          merchant: transactions.displayName,
          rawDescription: transactions.rawDescription,
          needsReview: sql<boolean>`${transactions.reviewStatus} = 'needs_review'`,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            color: categories.color,
          },
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(eq(transactions.ledgerId, context.ledger.id), isNull(transactions.deletedAt), ne(transactions.id, txn.id), sql`${transactions.rawDescription} ILIKE ${prefix + "%"}`))
        .orderBy(desc(transactions.date))
        .limit(params.data.limit)
    : [];

  const categorized = similar.filter((row) => row.category && !row.needsReview);
  const counts = new Map<string, { count: number; category: NonNullable<(typeof similar)[number]["category"]> }>();
  for (const row of categorized) {
    if (!row.category) {
      continue;
    }
    const current = counts.get(row.category.id);
    if (current) {
      current.count += 1;
    } else {
      counts.set(row.category.id, { count: 1, category: row.category });
    }
  }

  const suggestion = [...counts.values()].sort((left, right) => right.count - left.count)[0];
  const suggestedCategory = suggestion
    ? {
        id: suggestion.category.id,
        name: suggestion.category.name,
        slug: suggestion.category.slug,
        color: suggestion.category.color,
        confidence: suggestion.count / Math.max(categorized.length, 1),
        basedOn: suggestion.count,
      }
    : null;

  return NextResponse.json({
    data: {
      remaining,
      transaction: { ...txn, amount: txn.amountMinor / 100, tags: txn.tags ?? [], isTransfer: txn.transferStatus === "transfer" },
      similar: similar.map((row) => ({ ...row, amount: row.amountMinor / 100 })),
      suggestedCategory,
      merchantPrefix: prefix,
    },
  });
}

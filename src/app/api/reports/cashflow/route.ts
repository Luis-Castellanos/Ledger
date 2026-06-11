import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, lte, ne, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { categories, transactions } from "@/lib/db/schema";

const querySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  accountId: z.string().uuid().optional(),
});

/*
 * Server-side cashflow aggregation: transfers and excluded transactions stay
 * out, sums happen in SQL so window size never outgrows a page limit.
 */
export async function GET(request: NextRequest) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!params.success) {
    return NextResponse.json({ error: "Invalid cashflow query", issues: params.error.flatten().fieldErrors }, { status: 400 });
  }

  const conditions: (SQL | undefined)[] = [
    eq(transactions.ledgerId, context.ledger.id),
    isNull(transactions.deletedAt),
    ne(transactions.reviewStatus, "excluded"),
    eq(transactions.transferStatus, "none"),
  ];
  if (params.data.from) {
    conditions.push(gte(transactions.date, params.data.from));
  }
  if (params.data.to) {
    conditions.push(lte(transactions.date, params.data.to));
  }
  if (params.data.accountId) {
    conditions.push(eq(transactions.accountId, params.data.accountId));
  }
  const filter = and(...conditions);

  const db = getDb();
  const monthExpression = sql<string>`to_char(date_trunc('month', ${transactions.date}::timestamp), 'YYYY-MM')`;

  const months = await db
    .select({
      month: monthExpression,
      inflowMinor: sql<number>`coalesce(sum(case when ${transactions.amountMinor} > 0 then ${transactions.amountMinor} else 0 end), 0)::bigint`,
      outflowMinor: sql<number>`coalesce(sum(case when ${transactions.amountMinor} < 0 then ${transactions.amountMinor} else 0 end), 0)::bigint`,
    })
    .from(transactions)
    .where(filter)
    .groupBy(monthExpression)
    .orderBy(monthExpression);

  const categoryTotals = await db
    .select({
      categoryId: transactions.categoryId,
      category: sql<string | null>`${categories.name}`,
      totalMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .leftJoin(categories, and(eq(transactions.categoryId, categories.id), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .where(filter)
    .groupBy(transactions.categoryId, categories.name)
    .orderBy(sql`coalesce(sum(${transactions.amountMinor}), 0) asc`);

  return NextResponse.json({
    data: {
      months: months.map((row) => ({
        month: row.month,
        inflowMinor: Number(row.inflowMinor),
        outflowMinor: Number(row.outflowMinor),
        netMinor: Number(row.inflowMinor) + Number(row.outflowMinor),
      })),
      categories: categoryTotals.map((row) => ({
        categoryId: row.categoryId,
        category: row.category ?? "Uncategorized",
        totalMinor: Number(row.totalMinor),
        count: Number(row.count),
      })),
    },
  });
}

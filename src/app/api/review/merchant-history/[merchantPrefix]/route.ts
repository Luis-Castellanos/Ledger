import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { categories, transactions } from "@/lib/db/schema";

const querySchema = z.object({ exclude: z.string().uuid().optional() });

export async function GET(request: NextRequest, context: { params: Promise<{ merchantPrefix: string }> }) {
  const current = await getOrCreateCurrentLedger();

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { merchantPrefix: rawPrefix } = await context.params;
  const prefix = decodeURIComponent(rawPrefix);
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid merchant history query", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const rows = await getDb()
    .select({
      id: transactions.id,
      date: transactions.date,
      amountMinor: transactions.amountMinor,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, and(eq(transactions.categoryId, categories.id), eq(categories.ledgerId, current.ledger.id), isNull(categories.deletedAt)))
    .where(
      and(
        eq(transactions.ledgerId, current.ledger.id),
        isNull(transactions.deletedAt),
        sql`${transactions.rawDescription} ILIKE ${prefix + "%"}`,
        parsed.data.exclude ? ne(transactions.id, parsed.data.exclude) : undefined,
      ),
    )
    .orderBy(asc(transactions.date));

  if (rows.length === 0) {
    return NextResponse.json({ data: { totalCount: 0, totalAmount: 0, avgAmount: 0, cadence: "irregular", categories: [], lastFive: [] } });
  }

  const totalCount = rows.length;
  const totalAmountMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0);
  const avgAmountMinor = totalAmountMinor / totalCount;
  const cadence = calculateCadence(rows.map((row) => row.date));
  const categoryCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.categoryName) {
      categoryCounts.set(row.categoryName, (categoryCounts.get(row.categoryName) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    data: {
      totalCount,
      totalAmount: totalAmountMinor / 100,
      avgAmount: avgAmountMinor / 100,
      totalAmountMinor,
      avgAmountMinor,
      cadence,
      categories: [...categoryCounts.entries()].map(([name, count]) => ({ name, count })).sort((left, right) => right.count - left.count),
      lastFive: rows.slice(-5).reverse().map((row) => ({
        id: row.id,
        date: row.date,
        amount: row.amountMinor / 100,
        amountMinor: row.amountMinor,
        category: row.categoryName,
      })),
    },
  });
}

function calculateCadence(dates: string[]) {
  if (dates.length < 2) {
    return "irregular" as const;
  }

  const intervals: number[] = [];
  for (let index = 1; index < dates.length; index += 1) {
    intervals.push(Math.abs(new Date(dates[index]!).getTime() - new Date(dates[index - 1]!).getTime()) / 86_400_000);
  }
  intervals.sort((left, right) => left - right);
  const midpoint = Math.floor(intervals.length / 2);
  const median = intervals.length % 2 ? intervals[midpoint]! : (intervals[midpoint - 1]! + intervals[midpoint]!) / 2;

  if (median >= 25 && median <= 35) {
    return "monthly" as const;
  }
  if (median >= 5 && median <= 9) {
    return "weekly" as const;
  }
  if (median >= 350 && median <= 380) {
    return "yearly" as const;
  }
  return "irregular" as const;
}

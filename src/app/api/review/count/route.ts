import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.ledgerId, context.ledger.id),
        eq(transactions.reviewStatus, "needs_review"),
        isNull(transactions.deletedAt),
      ),
    );

  return NextResponse.json({ data: { count: Number(count) } });
}

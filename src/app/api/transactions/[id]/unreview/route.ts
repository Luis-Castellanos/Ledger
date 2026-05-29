import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, transactions } from "@/lib/db/schema";

const bodySchema = z.object({ clearCategory: z.boolean().default(false) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const current = await getOrCreateCurrentLedger();

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid unreview request", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
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

  const [transaction] = await db
    .update(transactions)
    .set({ reviewStatus: "needs_review", ...(parsed.data.clearCategory ? { categoryId: null } : {}), updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.ledgerId, current.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: current.ledger.id,
    actorUserId: current.user.id,
    action: "transaction.unreviewed",
    entityType: "transaction",
    entityId: id,
    before: existing,
    after: transaction,
  });

  return NextResponse.json({ data: { id }, id });
}

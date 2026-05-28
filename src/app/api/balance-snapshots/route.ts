import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, balanceSnapshots } from "@/lib/db/schema";
import { createBalanceSnapshotSchema } from "@/lib/finance/account";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: balanceSnapshots.id,
      ledgerId: balanceSnapshots.ledgerId,
      accountId: balanceSnapshots.accountId,
      accountName: accounts.name,
      asOfDate: balanceSnapshots.asOfDate,
      balanceMinor: balanceSnapshots.balanceMinor,
      currency: balanceSnapshots.currency,
      source: balanceSnapshots.source,
      createdAt: balanceSnapshots.createdAt,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, and(eq(accounts.id, balanceSnapshots.accountId), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .where(eq(balanceSnapshots.ledgerId, context.ledger.id))
    .orderBy(desc(balanceSnapshots.asOfDate), desc(balanceSnapshots.createdAt))
    .limit(100);

  return NextResponse.json({ snapshots: rows });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createBalanceSnapshotSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid balance snapshot", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const [snapshot] = await db
    .insert(balanceSnapshots)
    .values({
      ledgerId: context.ledger.id,
      accountId: account.id,
      asOfDate: parsed.data.asOfDate,
      balanceMinor: parsed.data.balance,
      currency: account.currency,
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [balanceSnapshots.accountId, balanceSnapshots.asOfDate],
      set: {
        balanceMinor: parsed.data.balance,
        currency: account.currency,
        source: "manual",
      },
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "balance_snapshot.upserted",
    entityType: "balance_snapshot",
    entityId: snapshot.id,
    after: snapshot,
  });

  return NextResponse.json({ snapshot: { ...snapshot, accountName: account.name } }, { status: 201 });
}

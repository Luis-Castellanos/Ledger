import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, balanceSnapshots } from "@/lib/db/schema";
import { createBalanceSnapshotApiSchema } from "@/lib/finance/account";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  accountId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!params.success) {
    return NextResponse.json({ error: "Invalid snapshots query", issues: params.error.flatten().fieldErrors }, { status: 400 });
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
    .where(
      and(
        eq(balanceSnapshots.ledgerId, context.ledger.id),
        ...(params.data.accountId ? [eq(balanceSnapshots.accountId, params.data.accountId)] : []),
      ),
    )
    .orderBy(desc(balanceSnapshots.asOfDate), desc(balanceSnapshots.createdAt))
    .limit(params.data.limit);

  return NextResponse.json({ snapshots: rows });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "balance-snapshots");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, createBalanceSnapshotApiSchema, "balance snapshot");
  if (!parsed.ok) {
    return parsed.response;
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

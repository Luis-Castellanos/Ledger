import { NextResponse } from "next/server";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, balanceSnapshots, goals } from "@/lib/db/schema";
import { createGoalSchema, goalPercent, goalProgressMinor } from "@/lib/finance/goal";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: goals.id,
      name: goals.name,
      color: goals.color,
      accountId: goals.accountId,
      accountName: accounts.name,
      targetAmountMinor: goals.targetAmountMinor,
      startingAmountMinor: goals.startingAmountMinor,
      manualProgressMinor: goals.manualProgressMinor,
      currency: goals.currency,
      targetDate: goals.targetDate,
      status: goals.status,
      createdAt: goals.createdAt,
    })
    .from(goals)
    .leftJoin(accounts, and(eq(goals.accountId, accounts.id), eq(accounts.ledgerId, context.ledger.id)))
    .where(and(eq(goals.ledgerId, context.ledger.id), isNull(goals.deletedAt), ne(goals.status, "archived")))
    .orderBy(goals.sortOrder, goals.createdAt);

  /* latest balance per linked account */
  const linkedAccountIds = [...new Set(rows.map((row) => row.accountId).filter((id): id is string => Boolean(id)))];
  const latestBalanceByAccount = new Map<string, number>();
  if (linkedAccountIds.length > 0) {
    const snapshots = await db
      .select({
        accountId: balanceSnapshots.accountId,
        balanceMinor: balanceSnapshots.balanceMinor,
        asOfDate: balanceSnapshots.asOfDate,
      })
      .from(balanceSnapshots)
      .where(eq(balanceSnapshots.ledgerId, context.ledger.id))
      .orderBy(desc(balanceSnapshots.asOfDate), desc(balanceSnapshots.createdAt));
    for (const snapshot of snapshots) {
      if (!latestBalanceByAccount.has(snapshot.accountId)) {
        latestBalanceByAccount.set(snapshot.accountId, Number(snapshot.balanceMinor));
      }
    }
  }

  return NextResponse.json({
    data: {
      goals: rows.map((row) => {
        const progressMinor = goalProgressMinor(
          {
            accountId: row.accountId,
            startingAmountMinor: Number(row.startingAmountMinor),
            manualProgressMinor: Number(row.manualProgressMinor),
            targetAmountMinor: Number(row.targetAmountMinor),
          },
          row.accountId ? (latestBalanceByAccount.get(row.accountId) ?? null) : null,
        );
        return {
          ...row,
          targetAmountMinor: Number(row.targetAmountMinor),
          startingAmountMinor: Number(row.startingAmountMinor),
          manualProgressMinor: Number(row.manualProgressMinor),
          progressMinor,
          percent: goalPercent(progressMinor, Number(row.targetAmountMinor)),
        };
      }),
    },
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "goals");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, createGoalSchema, "goal");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();

  if (parsed.data.accountId) {
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
      .limit(1);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
  }

  const [goal] = await db
    .insert(goals)
    .values({
      ledgerId: context.ledger.id,
      name: parsed.data.name,
      accountId: parsed.data.accountId ?? null,
      targetAmountMinor: parsed.data.targetAmount,
      startingAmountMinor: parsed.data.startingAmount ?? 0,
      currency: context.ledger.defaultCurrency ?? "USD",
      targetDate: parsed.data.targetDate ?? null,
      color: parsed.data.color ?? null,
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "goal.created",
    entityType: "goal",
    entityId: goal.id,
    after: goal,
  });

  return NextResponse.json({ goal }, { status: 201 });
}

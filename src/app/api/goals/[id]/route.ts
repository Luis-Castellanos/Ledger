import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, goals } from "@/lib/db/schema";
import { updateGoalSchema } from "@/lib/finance/goal";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

const idSchema = z.string().uuid();

export async function PATCH(request: NextRequest, routeContext: { params: Promise<{ id: string }> }) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "goals");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const { id: rawId } = await routeContext.params;
  const id = idSchema.safeParse(rawId);
  if (!id.success) {
    return NextResponse.json({ error: "Invalid goal id" }, { status: 400 });
  }

  const parsed = await parseJsonRequest(request, updateGoalSchema, "goal update");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id.data), eq(goals.ledgerId, context.ledger.id), isNull(goals.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

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

  const nextManualProgress =
    parsed.data.contribute !== undefined
      ? Math.max(0, Number(existing.manualProgressMinor) + parsed.data.contribute)
      : undefined;

  const [goal] = await db
    .update(goals)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.targetAmount !== undefined ? { targetAmountMinor: parsed.data.targetAmount } : {}),
      ...(parsed.data.accountId !== undefined ? { accountId: parsed.data.accountId } : {}),
      ...(parsed.data.targetDate !== undefined ? { targetDate: parsed.data.targetDate } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      ...(nextManualProgress !== undefined ? { manualProgressMinor: nextManualProgress } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id.data), eq(goals.ledgerId, context.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "goal.updated",
    entityType: "goal",
    entityId: goal.id,
    before: existing,
    after: goal,
  });

  return NextResponse.json({ goal });
}

export async function DELETE(_request: NextRequest, routeContext: { params: Promise<{ id: string }> }) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "goals");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const { id: rawId } = await routeContext.params;
  const id = idSchema.safeParse(rawId);
  if (!id.success) {
    return NextResponse.json({ error: "Invalid goal id" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id.data), eq(goals.ledgerId, context.ledger.id), isNull(goals.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const [goal] = await db
    .update(goals)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(goals.id, id.data), eq(goals.ledgerId, context.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "goal.deleted",
    entityType: "goal",
    entityId: goal.id,
    before: existing,
    after: goal,
  });

  return NextResponse.json({ goal });
}

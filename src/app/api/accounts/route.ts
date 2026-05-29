import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents } from "@/lib/db/schema";
import { createAccountSchema, updateAccountLifecycleSchema } from "@/lib/finance/account";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .orderBy(asc(accounts.sortOrder), asc(accounts.name));

  return NextResponse.json({ accounts: rows });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "accounts");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, createAccountSchema, "account");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [account] = await db
    .insert(accounts)
    .values({
      ledgerId: context.ledger.id,
      name: parsed.data.name,
      institution: parsed.data.institution,
      mask: parsed.data.mask,
      type: parsed.data.type,
      assetClass: parsed.data.assetClass,
      currency: parsed.data.currency,
      openedOn: parsed.data.openedOn,
      notes: parsed.data.notes,
      isHidden: parsed.data.isHidden,
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "account.created",
    entityType: "account",
    entityId: account.id,
    after: account,
  });

  return NextResponse.json({ account }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "accounts");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, updateAccountLifecycleSchema, "account update");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.id), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!existingAccount) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const closedOn = parsed.data.closedOn ?? new Date().toISOString().slice(0, 10);

  if (parsed.data.action === "close" && existingAccount.openedOn && closedOn < existingAccount.openedOn) {
    return NextResponse.json({ error: "Close date cannot precede open date" }, { status: 400 });
  }

  const [account] = await db
    .update(accounts)
    .set({
      isActive: parsed.data.action === "reopen",
      closedOn: parsed.data.action === "close" ? closedOn : null,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, parsed.data.id), eq(accounts.ledgerId, context.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: parsed.data.action === "close" ? "account.closed" : "account.reopened",
    entityType: "account",
    entityId: account.id,
    before: existingAccount,
    after: account,
  });

  return NextResponse.json({ account });
}

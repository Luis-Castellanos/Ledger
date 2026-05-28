import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents } from "@/lib/db/schema";
import { createAccountSchema } from "@/lib/finance/account";

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

  const parsed = createAccountSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
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

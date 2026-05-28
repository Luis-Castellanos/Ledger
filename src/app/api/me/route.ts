import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, ledgers } from "@/lib/db/schema";
import { updateLedgerSettingsSchema } from "@/lib/finance/settings";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      displayName: context.user.displayName,
    },
    ledger: {
      id: context.ledger.id,
      name: context.ledger.name,
      defaultCurrency: context.ledger.defaultCurrency,
    },
  });
}

export async function PATCH(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateLedgerSettingsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const [ledger] = await db
    .update(ledgers)
    .set({
      name: parsed.data.name,
      defaultCurrency: parsed.data.defaultCurrency,
      updatedAt: new Date(),
    })
    .where(eq(ledgers.id, context.ledger.id))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "ledger.settings_updated",
    entityType: "ledger",
    entityId: context.ledger.id,
    before: {
      name: context.ledger.name,
      defaultCurrency: context.ledger.defaultCurrency,
    },
    after: {
      name: ledger.name,
      defaultCurrency: ledger.defaultCurrency,
    },
  });

  return NextResponse.json({
    ledger: {
      id: ledger.id,
      name: ledger.name,
      defaultCurrency: ledger.defaultCurrency,
    },
  });
}

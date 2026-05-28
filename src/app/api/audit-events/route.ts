import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, users } from "@/lib/db/schema";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getDb()
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      createdAt: auditEvents.createdAt,
      actorEmail: users.email,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .where(eq(auditEvents.ledgerId, context.ledger.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(20);

  return NextResponse.json({
    auditEvents: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

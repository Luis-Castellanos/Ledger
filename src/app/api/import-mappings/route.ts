import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, savedImportMappings } from "@/lib/db/schema";
import { savedImportMappingSchema } from "@/lib/finance/import";
import { parseJsonRequest } from "@/lib/http/request";
import { checkRateLimit, rateLimitExceededResponse, rateLimitPolicies } from "@/lib/security/rate-limit";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getDb()
    .select({
      id: savedImportMappings.id,
      accountId: savedImportMappings.accountId,
      name: savedImportMappings.name,
      sourceKind: savedImportMappings.sourceKind,
      mapping: savedImportMappings.mapping,
      createdAt: savedImportMappings.createdAt,
      updatedAt: savedImportMappings.updatedAt,
    })
    .from(savedImportMappings)
    .where(eq(savedImportMappings.ledgerId, context.ledger.id))
    .orderBy(desc(savedImportMappings.updatedAt), desc(savedImportMappings.createdAt));

  return NextResponse.json({
    mappings: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `user:${context.user.id}:import:mapping`,
    ...rateLimitPolicies.importMutation,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, savedImportMappingSchema, "import mapping");
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

  const [mapping] = await db
    .insert(savedImportMappings)
    .values({
      ledgerId: context.ledger.id,
      accountId: parsed.data.accountId,
      name: parsed.data.name,
      sourceKind: "csv",
      mapping: parsed.data.mapping,
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "import_mapping.created",
    entityType: "saved_import_mapping",
    entityId: mapping.id,
    after: mapping,
  });

  return NextResponse.json({ mapping }, { status: 201 });
}

import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, imports } from "@/lib/db/schema";
import { importActionParamsSchema } from "@/lib/finance/import";
import { checkRateLimit, rateLimitExceededResponse, rateLimitPolicies } from "@/lib/security/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `user:${context.user.id}:import:rollback`,
    ...rateLimitPolicies.importMutation,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = importActionParamsSchema.safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import id", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const [batch] = await db
    .select({
      id: imports.id,
      filename: imports.originalFilename,
      status: imports.status,
    })
    .from(imports)
    .innerJoin(accounts, and(eq(imports.accountId, accounts.id), eq(accounts.ledgerId, context.ledger.id)))
    .where(and(eq(imports.id, parsed.data.id), eq(imports.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!batch) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  if (batch.status !== "committed") {
    return NextResponse.json({ error: "Only committed imports can be rolled back" }, { status: 409 });
  }

  const auditAfter = {
    filename: batch.filename,
    status: "rolled_back",
  };

  const result = await db.execute<{ rolled_back_count: number }>(sql`
    WITH linked_rows AS (
      SELECT committed_transaction_id
      FROM import_rows
      WHERE import_id = ${batch.id}
        AND committed_transaction_id IS NOT NULL
    ),
    soft_deleted_transactions AS (
      UPDATE transactions
      SET deleted_at = now(), updated_at = now()
      WHERE ledger_id = ${context.ledger.id}
        AND source = 'import'
        AND deleted_at IS NULL
        AND id IN (SELECT committed_transaction_id FROM linked_rows)
      RETURNING id
    ),
    cleared_rows AS (
      UPDATE import_rows
      SET committed_transaction_id = NULL
      WHERE import_id = ${batch.id}
        AND committed_transaction_id IN (SELECT id FROM soft_deleted_transactions)
      RETURNING id
    ),
    updated_import AS (
      UPDATE imports
      SET status = 'rolled_back', committed_at = NULL, updated_at = now()
      WHERE id = ${batch.id}
      RETURNING id
    ),
    audit AS (
      INSERT INTO audit_events (
        ledger_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        after
      )
      SELECT
        ${context.ledger.id},
        ${context.user.id},
        'import.rolled_back',
        'import',
        ${batch.id},
        ${JSON.stringify(auditAfter)}::jsonb
      FROM updated_import
    )
    SELECT count(*)::int AS rolled_back_count FROM cleared_rows;
  `);

  return NextResponse.json({
    import: { id: batch.id, status: "rolled_back" },
    rolledBackCount: result.rows[0]?.rolled_back_count ?? 0,
  });
}

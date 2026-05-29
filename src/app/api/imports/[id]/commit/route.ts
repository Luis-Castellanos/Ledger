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
    key: `user:${context.user.id}:import:commit`,
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
      accountId: imports.accountId,
      filename: imports.originalFilename,
      status: imports.status,
      currency: accounts.currency,
    })
    .from(imports)
    .innerJoin(accounts, and(eq(imports.accountId, accounts.id), eq(accounts.ledgerId, context.ledger.id)))
    .where(and(eq(imports.id, parsed.data.id), eq(imports.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!batch) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  if (batch.status === "committed") {
    return NextResponse.json({ error: "Import is already committed" }, { status: 409 });
  }

  if (batch.status === "rolled_back") {
    return NextResponse.json({ error: "Rolled back imports must be restaged before commit" }, { status: 409 });
  }

  const dedupePrefix = `import:${batch.id}:`;
  const auditAfter = {
    filename: batch.filename,
    status: "committed",
  };

  const result = await db.execute<{ committed_count: number }>(sql`
    WITH eligible_rows AS (
      SELECT
        id,
        row_number,
        parsed_date,
        parsed_amount_minor,
        parsed_description,
        proposed_category_id,
        validation_status
      FROM import_rows
      WHERE import_id = ${batch.id}
        AND committed_transaction_id IS NULL
        AND validation_status IN ('accepted', 'needs_review')
        AND parsed_date IS NOT NULL
        AND parsed_amount_minor IS NOT NULL
        AND parsed_description IS NOT NULL
    ),
    inserted_transactions AS (
      INSERT INTO transactions (
        ledger_id,
        account_id,
        category_id,
        date,
        amount_minor,
        currency,
        raw_description,
        display_name,
        review_status,
        source,
        dedupe_key
      )
      SELECT
        ${context.ledger.id},
        ${batch.accountId},
        proposed_category_id,
        parsed_date,
        parsed_amount_minor,
        ${batch.currency},
        parsed_description,
        parsed_description,
        CASE WHEN validation_status = 'accepted' THEN 'reviewed' ELSE 'needs_review' END,
        'import',
        ${dedupePrefix} || row_number::text
      FROM eligible_rows
      ON CONFLICT DO NOTHING
      RETURNING id, dedupe_key
    ),
    updated_rows AS (
      UPDATE import_rows
      SET committed_transaction_id = inserted_transactions.id
      FROM inserted_transactions
      WHERE import_rows.import_id = ${batch.id}
        AND inserted_transactions.dedupe_key = ${dedupePrefix} || import_rows.row_number::text
      RETURNING import_rows.id
    ),
    updated_import AS (
      UPDATE imports
      SET status = 'committed', committed_at = now(), updated_at = now()
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
        'import.committed',
        'import',
        ${batch.id},
        ${JSON.stringify(auditAfter)}::jsonb
      FROM updated_import
    )
    SELECT count(*)::int AS committed_count FROM updated_rows;
  `);

  return NextResponse.json({
    import: { id: batch.id, status: "committed" },
    committedCount: result.rows[0]?.committed_count ?? 0,
  });
}

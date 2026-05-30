import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, importRows, imports, transactions } from "@/lib/db/schema";
import { buildImportTransactionInsert, importActionParamsSchema, type ImportCommitCandidate } from "@/lib/finance/import";
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

  const auditAfter = {
    filename: batch.filename,
    status: "committed",
  };

  const rows = await db
    .select({
      rowId: importRows.id,
      parsedDate: importRows.parsedDate,
      parsedAmountMinor: importRows.parsedAmountMinor,
      parsedDescription: importRows.parsedDescription,
      proposedCategoryId: importRows.proposedCategoryId,
      validationStatus: importRows.validationStatus,
    })
    .from(importRows)
    .where(
      and(
        eq(importRows.importId, batch.id),
        isNull(importRows.committedTransactionId),
        inArray(importRows.validationStatus, ["accepted", "needs_review"]),
        isNotNull(importRows.parsedDate),
        isNotNull(importRows.parsedAmountMinor),
        isNotNull(importRows.parsedDescription),
      ),
    );

  const candidates = rows.map((row) => ({
    ledgerId: context.ledger.id,
    accountId: batch.accountId,
    currency: batch.currency,
    rowId: row.rowId,
    parsedDate: row.parsedDate,
    parsedAmountMinor: row.parsedAmountMinor,
    parsedDescription: row.parsedDescription,
    proposedCategoryId: row.proposedCategoryId,
    validationStatus: row.validationStatus,
  })) as ImportCommitCandidate[];
  const insertValues = candidates.map(buildImportTransactionInsert);
  const insertedTransactions =
    insertValues.length > 0
      ? await db
          .insert(transactions)
          .values(insertValues)
          .onConflictDoNothing()
          .returning({ id: transactions.id, dedupeKey: transactions.dedupeKey })
      : [];
  const insertedIdByDedupeKey = new Map(insertedTransactions.map((transaction) => [transaction.dedupeKey, transaction.id]));
  const committedRows = candidates
    .map((row) => ({
      rowId: row.rowId,
      transactionId: insertedIdByDedupeKey.get(buildImportTransactionInsert(row).dedupeKey),
    }))
    .filter((row): row is { rowId: string; transactionId: string } => Boolean(row.transactionId));
  const duplicateRowIds = candidates
    .filter((row) => !insertedIdByDedupeKey.has(buildImportTransactionInsert(row).dedupeKey))
    .map((row) => row.rowId);

  for (const row of committedRows) {
    await db
      .update(importRows)
      .set({ committedTransactionId: row.transactionId })
      .where(and(eq(importRows.id, row.rowId), eq(importRows.importId, batch.id)));
  }

  if (duplicateRowIds.length > 0) {
    await db
      .update(importRows)
      .set({
        validationStatus: "duplicate",
        validationMessage: "Duplicate transaction already exists for this ledger/account/date/amount/description.",
      })
      .where(and(eq(importRows.importId, batch.id), inArray(importRows.id, duplicateRowIds)));
  }

  await db.update(imports).set({ status: "committed", committedAt: new Date(), updatedAt: new Date() }).where(eq(imports.id, batch.id));
  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "import.committed",
    entityType: "import",
    entityId: batch.id,
    after: auditAfter,
    metadata: { committed: committedRows.length, duplicates: duplicateRowIds.length },
  });

  return NextResponse.json({
    import: { id: batch.id, status: "committed" },
    committedCount: committedRows.length,
    duplicateCount: duplicateRowIds.length,
  });
}

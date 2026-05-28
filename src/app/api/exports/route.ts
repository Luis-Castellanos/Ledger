import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, categories, exportJobs, importRows, imports, transactions } from "@/lib/db/schema";
import { buildExportFilename, isExportFormat, toCsv } from "@/lib/finance/export";

export async function GET(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (!isExportFormat(format)) {
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  }

  const db = getDb();
  const createdAt = new Date();
  const filename = buildExportFilename(format, createdAt);
  const [job] = await db
    .insert(exportJobs)
    .values({
      ledgerId: context.ledger.id,
      requestedByUserId: context.user.id,
      status: "running",
      format,
      includeAuditEvents: true,
      filters: {},
    })
    .returning();

  try {
    const response =
      format === "transactions_csv"
        ? await buildTransactionsCsvResponse({ ledgerId: context.ledger.id, filename })
        : await buildBackupPackageResponse({ ledgerId: context.ledger.id, filename });

    await db
      .update(exportJobs)
      .set({
        status: "succeeded",
        artifactUrl: filename,
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, job.id));

    await db.insert(auditEvents).values({
      ledgerId: context.ledger.id,
      actorUserId: context.user.id,
      action: "export.created",
      entityType: "export_job",
      entityId: job.id,
      after: {
        format,
        filename,
      },
    });

    return response;
  } catch (error) {
    await db
      .update(exportJobs)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Export failed",
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, job.id));

    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

async function buildTransactionsCsvResponse({ ledgerId, filename }: { ledgerId: string; filename: string }) {
  const db = getDb();
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      postedDate: transactions.postedDate,
      account: accounts.name,
      category: categories.name,
      merchant: transactions.displayName,
      rawDescription: transactions.rawDescription,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      reviewStatus: transactions.reviewStatus,
      transferStatus: transactions.transferStatus,
      source: transactions.source,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.ledgerId, ledgerId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const csv = toCsv(
    [
      "id",
      "date",
      "posted_date",
      "account",
      "category",
      "merchant",
      "raw_description",
      "amount_minor",
      "currency",
      "review_status",
      "transfer_status",
      "source",
      "notes",
      "created_at",
      "updated_at",
    ],
    rows.map((row) => [
      row.id,
      row.date,
      row.postedDate,
      row.account,
      row.category ?? "Uncategorized",
      row.merchant,
      row.rawDescription,
      row.amountMinor,
      row.currency,
      row.reviewStatus,
      row.transferStatus,
      row.source,
      row.notes,
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    ]),
  );

  return new Response(csv, {
    headers: exportHeaders({ filename, contentType: "text/csv; charset=utf-8" }),
  });
}

async function buildBackupPackageResponse({ ledgerId, filename }: { ledgerId: string; filename: string }) {
  const db = getDb();
  const [accountRows, categoryRows, transactionRows, importBatchRows, importPreviewRows, auditRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.ledgerId, ledgerId)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.ledgerId, ledgerId)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.ledgerId, ledgerId)).orderBy(desc(transactions.date), desc(transactions.createdAt)),
    db.select().from(imports).where(eq(imports.ledgerId, ledgerId)).orderBy(desc(imports.createdAt)),
    db
      .select({
        id: importRows.id,
        importId: importRows.importId,
        rowNumber: importRows.rowNumber,
        raw: importRows.raw,
        parsedDate: importRows.parsedDate,
        parsedAmountMinor: importRows.parsedAmountMinor,
        parsedDescription: importRows.parsedDescription,
        proposedCategoryId: importRows.proposedCategoryId,
        validationStatus: importRows.validationStatus,
        validationMessage: importRows.validationMessage,
        committedTransactionId: importRows.committedTransactionId,
        createdAt: importRows.createdAt,
      })
      .from(importRows)
      .innerJoin(imports, eq(importRows.importId, imports.id))
      .where(eq(imports.ledgerId, ledgerId))
      .orderBy(asc(importRows.rowNumber)),
    db.select().from(auditEvents).where(eq(auditEvents.ledgerId, ledgerId)).orderBy(asc(auditEvents.createdAt)),
  ]);
  const exportedAt = new Date().toISOString();
  const body = JSON.stringify(
    {
      manifest: {
        version: 1,
        exportedAt,
        counts: {
          accounts: accountRows.length,
          categories: categoryRows.length,
          transactions: transactionRows.length,
          imports: importBatchRows.length,
          importRows: importPreviewRows.length,
          auditEvents: auditRows.length,
        },
      },
      data: {
        accounts: accountRows,
        categories: categoryRows,
        transactions: transactionRows,
        imports: importBatchRows,
        importRows: importPreviewRows,
        auditEvents: auditRows,
      },
    },
    null,
    2,
  );

  return new Response(body, {
    headers: exportHeaders({ filename, contentType: "application/json; charset=utf-8" }),
  });
}

function exportHeaders({ filename, contentType }: { filename: string; contentType: string }) {
  return {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  };
}

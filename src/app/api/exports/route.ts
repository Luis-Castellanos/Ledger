import { NextResponse } from "next/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, categories, documents, exportJobs, importRows, imports, savedImportMappings, transactions } from "@/lib/db/schema";
import { buildBackupPackage, buildExportFilename, exportFormats, formatTagsForCsv, toCsv, type ExportFormat } from "@/lib/finance/export";
import { parseJsonRequest } from "@/lib/http/request";
import { logServerError } from "@/lib/observability/server-logger";
import { checkRateLimit, rateLimitExceededResponse, rateLimitPolicies } from "@/lib/security/rate-limit";
import packageJson from "../../../../package.json";

const exportRequestSchema = z.object({
  format: z.enum(exportFormats),
});

export function GET() {
  return NextResponse.json({ error: "Use POST to generate exports." }, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, exportRequestSchema, "export request");
  if (!parsed.ok) {
    return parsed.response;
  }

  return generateExport(context, parsed.data.format);
}

async function generateExport(
  context: NonNullable<Awaited<ReturnType<typeof getOrCreateCurrentLedger>>>,
  format: ExportFormat,
) {
  const rateLimit = checkRateLimit({
    key: `user:${context.user.id}:export:${format}`,
    ...rateLimitPolicies.exportGeneration,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
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
        : await buildBackupPackageResponse({ ledger: context.ledger, filename });

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
    logServerError("export.failed", error, {
      exportJobId: job.id,
      format,
      ledgerId: context.ledger.id,
      userId: context.user.id,
    });

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
      tags: transactions.tags,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.ledgerId, ledgerId), isNull(transactions.deletedAt)))
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
      "tags",
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
      formatTagsForCsv(row.tags),
      row.notes,
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    ]),
  );

  return new Response(csv, {
    headers: exportHeaders({ filename, contentType: "text/csv; charset=utf-8" }),
  });
}

async function buildBackupPackageResponse({
  ledger,
  filename,
}: {
  ledger: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
  filename: string;
}) {
  const db = getDb();
  const [accountRows, categoryRows, transactionRows, savedImportMappingRows, documentRows, importBatchRows, importPreviewRows, auditRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.ledgerId, ledger.id)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.ledgerId, ledger.id)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.ledgerId, ledger.id)).orderBy(desc(transactions.date), desc(transactions.createdAt)),
    db.select().from(savedImportMappings).where(eq(savedImportMappings.ledgerId, ledger.id)).orderBy(asc(savedImportMappings.name)),
    db.select().from(documents).where(eq(documents.ledgerId, ledger.id)).orderBy(desc(documents.createdAt)),
    db.select().from(imports).where(eq(imports.ledgerId, ledger.id)).orderBy(desc(imports.createdAt)),
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
      .where(eq(imports.ledgerId, ledger.id))
      .orderBy(asc(importRows.rowNumber)),
    db.select().from(auditEvents).where(eq(auditEvents.ledgerId, ledger.id)).orderBy(asc(auditEvents.createdAt)),
  ]);

  const body = JSON.stringify(
    buildBackupPackage({
      ledger,
      appVersion: packageJson.version,
      data: {
        accounts: accountRows,
        categories: categoryRows,
        transactions: transactionRows,
        savedImportMappings: savedImportMappingRows,
        documents: documentRows,
        imports: importBatchRows,
        importRows: importPreviewRows,
        auditEvents: auditRows,
      },
    }),
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

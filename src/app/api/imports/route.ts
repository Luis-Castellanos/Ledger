import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, categories, importRows, imports } from "@/lib/db/schema";
import { buildImportFingerprint, stageImportSchema, updateImportRowSchema } from "@/lib/finance/import";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const batchRows = await db
    .select({
      id: imports.id,
      filename: imports.originalFilename,
      account: accounts.name,
      status: imports.status,
      uploadedAt: imports.createdAt,
      acceptedRows: imports.acceptedRowCount,
      rejectedRows: imports.rejectedRowCount,
    })
    .from(imports)
    .innerJoin(accounts, eq(imports.accountId, accounts.id))
    .where(eq(imports.ledgerId, context.ledger.id))
    .orderBy(desc(imports.createdAt))
    .limit(20);

  const latestImportId = batchRows[0]?.id;
  const stagedRows = latestImportId
    ? await db
        .select({
          id: importRows.id,
          rowNumber: importRows.rowNumber,
          date: importRows.parsedDate,
          description: importRows.parsedDescription,
          amountMinor: importRows.parsedAmountMinor,
          category: categories.name,
          status: importRows.validationStatus,
        })
        .from(importRows)
        .leftJoin(categories, eq(importRows.proposedCategoryId, categories.id))
        .where(eq(importRows.importId, latestImportId))
        .orderBy(importRows.rowNumber)
    : [];

  return NextResponse.json({
    batches: batchRows.map((batch) => ({
      ...batch,
      uploadedAt: batch.uploadedAt.toISOString().slice(0, 16).replace("T", " "),
    })),
    rows: stagedRows.map((row) => ({
      id: row.id,
      rowNumber: row.rowNumber,
      date: row.date ?? "",
      description: row.description ?? "",
      amountMinor: row.amountMinor ?? 0,
      category: row.category ?? "Uncategorized",
      status: row.status,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = stageImportSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const categoryRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)));
  const categoryIdByName = new Map(categoryRows.map((category) => [category.name, category.id]));
  const fingerprint = buildImportFingerprint({
    accountId: parsed.data.accountId,
    filename: parsed.data.filename,
    rows: parsed.data.rows,
  });
  const acceptedRowCount = parsed.data.rows.filter((row) => row.status === "accepted").length;
  const rejectedRowCount = parsed.data.rows.filter((row) => row.status === "rejected").length;

  const [batch] = await db
    .insert(imports)
    .values({
      ledgerId: context.ledger.id,
      accountId: parsed.data.accountId,
      uploadedByUserId: context.user.id,
      originalFilename: parsed.data.filename,
      fileSha256: fingerprint,
      status: "staged",
      rowCount: parsed.data.rows.length,
      acceptedRowCount,
      rejectedRowCount,
    })
    .returning();

  await db.insert(importRows).values(
    parsed.data.rows.map((row) => ({
      importId: batch.id,
      rowNumber: row.rowNumber,
      raw: {
        date: row.date,
        description: row.description,
        amount: row.amount,
        category: row.category,
      },
      parsedDate: row.date,
      parsedAmountMinor: row.amount,
      parsedDescription: row.description,
      proposedCategoryId: categoryIdByName.get(row.category),
      validationStatus: row.status,
    })),
  );

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "import.staged",
    entityType: "import",
    entityId: batch.id,
    after: {
      filename: batch.originalFilename,
      rowCount: batch.rowCount,
      acceptedRowCount: batch.acceptedRowCount,
      rejectedRowCount: batch.rejectedRowCount,
    },
  });

  return NextResponse.json({ import: batch }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateImportRowSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import row update", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = getDb();
  const [existingRow] = await db
    .select({
      id: importRows.id,
      importId: importRows.importId,
      validationStatus: importRows.validationStatus,
      proposedCategoryId: importRows.proposedCategoryId,
      ledgerId: imports.ledgerId,
    })
    .from(importRows)
    .innerJoin(imports, eq(importRows.importId, imports.id))
    .where(and(eq(importRows.id, parsed.data.id), eq(imports.ledgerId, context.ledger.id)))
    .limit(1);

  if (!existingRow) {
    return NextResponse.json({ error: "Import row not found" }, { status: 404 });
  }

  const [category] = parsed.data.category
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(and(eq(categories.ledgerId, context.ledger.id), eq(categories.name, parsed.data.category), isNull(categories.deletedAt)))
        .limit(1)
    : [];

  const [row] = await db
    .update(importRows)
    .set({
      validationStatus: parsed.data.status,
      proposedCategoryId: parsed.data.category ? category?.id ?? null : existingRow.proposedCategoryId,
    })
    .where(eq(importRows.id, parsed.data.id))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "import_row.updated",
    entityType: "import_row",
    entityId: row.id,
    before: existingRow,
    after: row,
  });

  return NextResponse.json({ row });
}

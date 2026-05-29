import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, documents } from "@/lib/db/schema";
import { canCreateDocumentMetadataOnly, documentStorageUnavailableResponse } from "@/lib/finance/document-storage";
import { detectDocumentType, documentStatuses, documentTypes, validateDocumentIntake } from "@/lib/finance/document";
import { parseFormDataRequest, parseJsonRequest } from "@/lib/http/request";
import { checkRateLimit, checkUserMutationRateLimit, rateLimitExceededResponse, rateLimitPolicies } from "@/lib/security/rate-limit";

const documentUpdateSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid().nullable().optional(),
  detectedType: z.enum(documentTypes).optional(),
  status: z.enum(documentStatuses).optional(),
  statementPeriod: z.string().max(80).nullable().optional(),
  detectedIssuer: z.string().max(160).nullable().optional(),
});

const documentDeleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      mimeType: documents.mimeType,
      byteSize: documents.byteSize,
      detectedType: documents.detectedType,
      detectedIssuer: documents.detectedIssuer,
      statementPeriod: documents.statementPeriod,
      status: documents.status,
      transactionCount: documents.transactionCount,
      parseError: documents.parseError,
      uploadedAt: documents.createdAt,
      accountId: documents.accountId,
      accountName: accounts.name,
      accountInstitution: accounts.institution,
      accountMask: accounts.mask,
      accountType: accounts.type,
    })
    .from(documents)
    .leftJoin(accounts, and(eq(documents.accountId, accounts.id), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .where(and(eq(documents.ledgerId, context.ledger.id), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({
    documents: rows.map((row) => ({
      ...row,
      uploadedAt: row.uploadedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `user:${context.user.id}:documents:upload`,
    ...rateLimitPolicies.importMutation,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  if (!canCreateDocumentMetadataOnly()) {
    return NextResponse.json(documentStorageUnavailableResponse(), { status: 503 });
  }

  const parsedForm = await parseFormDataRequest(request, "document upload");
  if (!parsedForm.ok) {
    return parsedForm.response;
  }

  const files = parsedForm.data.getAll("files").filter((item): item is File => item instanceof File);

  const validation = validateDocumentIntake(files);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = getDb();
  const results = [];

  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const fileSha256 = createHash("sha256").update(bytes).digest("hex");
    const detected = detectDocumentType(file.name, file.type);
    const [existing] = await db
      .select({ id: documents.id, status: documents.status })
      .from(documents)
      .where(and(eq(documents.ledgerId, context.ledger.id), eq(documents.fileSha256, fileSha256), isNull(documents.deletedAt)))
      .limit(1);

    if (existing) {
      results.push({
        id: existing.id,
        fileName: file.name,
        status: "duplicate",
        detectedType: detected.type,
        transactionCount: 0,
        byteSize: file.size,
      });
      continue;
    }

    const [document] = await db
      .insert(documents)
      .values({
        ledgerId: context.ledger.id,
        uploadedByUserId: context.user.id,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        fileSha256,
        detectedType: detected.type,
        detectedIssuer: detected.issuer,
        status: detected.deferred ? "deferred" : "uploaded",
        parseError: detected.deferred ? "Parser not implemented for this document type yet." : null,
        storageKey: `pending://${context.ledger.id}/${fileSha256}`,
        metadata: {
          originalLastModified: file.lastModified || null,
        },
      })
      .returning();

    await db.insert(auditEvents).values({
      ledgerId: context.ledger.id,
      actorUserId: context.user.id,
      action: "document.uploaded",
      entityType: "document",
      entityId: document.id,
      after: {
        fileName: document.fileName,
        detectedType: document.detectedType,
        status: document.status,
        byteSize: document.byteSize,
      },
    });

    results.push({
      id: document.id,
      fileName: document.fileName,
      status: document.status,
      detectedType: document.detectedType,
      transactionCount: document.transactionCount,
      byteSize: document.byteSize,
    });
  }

  return NextResponse.json({
    summary: summarizeDocumentResults(results),
    results,
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "documents");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, documentUpdateSchema, "document update");
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

  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, parsed.data.id), eq(documents.ledgerId, context.ledger.id), isNull(documents.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const [document] = await db
    .update(documents)
    .set({
      accountId: parsed.data.accountId === undefined ? existing.accountId : parsed.data.accountId,
      detectedType: parsed.data.detectedType ?? existing.detectedType,
      detectedIssuer: parsed.data.detectedIssuer === undefined ? existing.detectedIssuer : parsed.data.detectedIssuer,
      statementPeriod: parsed.data.statementPeriod === undefined ? existing.statementPeriod : parsed.data.statementPeriod,
      status: parsed.data.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, parsed.data.id), eq(documents.ledgerId, context.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "document.updated",
    entityType: "document",
    entityId: document.id,
    before: existing,
    after: document,
  });

  return NextResponse.json({ document });
}

export async function DELETE(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "documents");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, documentDeleteSchema, "document delete");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [document] = await db
    .update(documents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(documents.id, parsed.data.id), eq(documents.ledgerId, context.ledger.id), isNull(documents.deletedAt)))
    .returning();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "document.deleted",
    entityType: "document",
    entityId: document.id,
    after: document,
  });

  return NextResponse.json({ document });
}

function summarizeDocumentResults(results: Array<{ status: string }>) {
  return results.reduce(
    (summary, result) => {
      summary.total += 1;
      if (result.status === "duplicate") summary.duplicate += 1;
      else if (result.status === "deferred") summary.deferred += 1;
      else if (result.status === "failed") summary.failed += 1;
      else summary.uploaded += 1;
      return summary;
    },
    { total: 0, uploaded: 0, deferred: 0, duplicate: 0, failed: 0 },
  );
}

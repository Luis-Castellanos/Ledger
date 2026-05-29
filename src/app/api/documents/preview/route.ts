import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { detectDocumentType, validateDocumentIntake } from "@/lib/finance/document";
import { parseFormDataRequest } from "@/lib/http/request";
import { checkRateLimit, rateLimitExceededResponse, rateLimitPolicies } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `user:${context.user.id}:documents:preview`,
    ...rateLimitPolicies.importMutation,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsedForm = await parseFormDataRequest(request, "document preview");
  if (!parsedForm.ok) {
    return parsedForm.response;
  }

  const files = parsedForm.data.getAll("files").filter((item): item is File => item instanceof File);

  const validation = validateDocumentIntake(files);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const fingerprints = await Promise.all(
    files.map(async (file) => ({
      file,
      sha256: createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex"),
    })),
  );
  const existing = fingerprints.length
    ? await getDb()
        .select({ fileSha256: documents.fileSha256 })
        .from(documents)
        .where(and(eq(documents.ledgerId, context.ledger.id), isNull(documents.deletedAt), inArray(documents.fileSha256, fingerprints.map((item) => item.sha256))))
    : [];
  const duplicateFingerprints = new Set(existing.map((item) => item.fileSha256));
  const results = fingerprints.map(({ file, sha256 }) => {
    const detected = detectDocumentType(file.name, file.type);
    const duplicate = duplicateFingerprints.has(sha256);
    return {
      fileName: file.name,
      status: duplicate ? "duplicate" : detected.deferred ? "deferred" : "ready",
      detectedType: detected.type,
      detectedIssuer: detected.issuer,
      byteSize: file.size,
      transactionCount: detected.deferred || duplicate ? 0 : null,
      message: duplicate ? "Already exists in Files." : detected.deferred ? "Stored now; parser support can be added later." : "Ready to store as source evidence.",
    };
  });

  return NextResponse.json({
    summary: results.reduce(
      (summary, result) => {
        summary.total += 1;
        if (result.status === "ready") summary.ready += 1;
        if (result.status === "duplicate") summary.duplicate += 1;
        if (result.status === "deferred") summary.deferred += 1;
        return summary;
      },
      { total: 0, ready: 0, duplicate: 0, deferred: 0 },
    ),
    results,
  });
}

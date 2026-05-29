import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
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

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
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
    const detected = detectPreviewType(file.name, file.type);
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

function detectPreviewType(fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase();
  const issuer =
    ["fidelity", "chase", "american express", "amex", "capital one", "citi", "discover", "apple", "schwab"].find((name) =>
      lower.includes(name.replace(/\s+/g, "")) || lower.includes(name),
    ) ?? null;

  if (!lower.endsWith(".pdf") && mimeType !== "application/pdf") {
    return { type: "unknown", issuer, deferred: true };
  }
  if (lower.includes("paystub") || lower.includes("payroll")) return { type: "paystub", issuer, deferred: true };
  if (lower.includes("credit") || lower.includes("card") || lower.includes("amex")) return { type: "credit_card", issuer, deferred: false };
  if (lower.includes("brokerage") || lower.includes("ira") || lower.includes("investment") || lower.includes("fidelity")) return { type: "investment", issuer, deferred: false };
  if (lower.includes("loan") || lower.includes("mortgage")) return { type: "loan", issuer, deferred: true };
  return { type: "bank", issuer, deferred: false };
}

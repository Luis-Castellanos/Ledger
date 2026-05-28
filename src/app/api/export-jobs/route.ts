import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { exportJobs } from "@/lib/db/schema";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getDb()
    .select({
      id: exportJobs.id,
      status: exportJobs.status,
      format: exportJobs.format,
      includeAuditEvents: exportJobs.includeAuditEvents,
      artifactUrl: exportJobs.artifactUrl,
      errorMessage: exportJobs.errorMessage,
      createdAt: exportJobs.createdAt,
      completedAt: exportJobs.completedAt,
    })
    .from(exportJobs)
    .where(eq(exportJobs.ledgerId, context.ledger.id))
    .orderBy(desc(exportJobs.createdAt))
    .limit(10);

  return NextResponse.json({
    exportJobs: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    })),
  });
}

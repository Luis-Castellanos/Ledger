import { NextResponse } from "next/server";
import { getDeploymentHealthReport } from "@/lib/setup/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getDeploymentHealthReport();

  return NextResponse.json(
    {
      service: report.service,
      ok: report.ok,
      checkedAt: report.checkedAt,
      readiness: {
        ready: report.readiness.ready,
        readyCount: report.readiness.readyCount,
        requiredCount: report.readiness.requiredCount,
      },
    },
    { status: report.ok ? 200 : 503 },
  );
}

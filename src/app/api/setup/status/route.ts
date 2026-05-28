import { NextResponse } from "next/server";
import { getDeploymentHealthReport } from "@/lib/setup/health";

export async function GET() {
  const report = await getDeploymentHealthReport();

  return NextResponse.json({
    status: report.status,
    readiness: report.readiness,
    checkedAt: report.checkedAt,
  });
}

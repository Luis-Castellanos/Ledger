import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/setup/status";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = getHealthReport();

  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}

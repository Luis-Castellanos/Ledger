import { NextResponse } from "next/server";
import { getSetupReadiness, getSetupStatus } from "@/lib/setup/status";

export async function GET() {
  const status = getSetupStatus();

  return NextResponse.json({
    status,
    readiness: getSetupReadiness(status),
  });
}

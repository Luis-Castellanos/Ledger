import { NextResponse } from "next/server";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      displayName: context.user.displayName,
    },
    ledger: {
      id: context.ledger.id,
      name: context.ledger.name,
      defaultCurrency: context.ledger.defaultCurrency,
    },
  });
}

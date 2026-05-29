import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { accounts, auditEvents, categories, merchantRules } from "@/lib/db/schema";
import { createMerchantRuleApiSchema, normalizeRuleMatchValue } from "@/lib/finance/rules";
import { parseJsonRequest } from "@/lib/http/request";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: merchantRules.id,
      name: merchantRules.name,
      matchType: merchantRules.matchType,
      matchValue: merchantRules.matchValue,
      priority: merchantRules.priority,
      isActive: merchantRules.isActive,
      categoryId: merchantRules.categoryId,
      categoryName: categories.name,
      accountId: merchantRules.accountId,
      accountName: accounts.name,
    })
    .from(merchantRules)
    .innerJoin(categories, and(eq(merchantRules.categoryId, categories.id), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .leftJoin(accounts, and(eq(merchantRules.accountId, accounts.id), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
    .where(and(eq(merchantRules.ledgerId, context.ledger.id), isNull(merchantRules.deletedAt)))
    .orderBy(asc(merchantRules.priority), asc(merchantRules.name));

  return NextResponse.json({ rules: rows });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, createMerchantRuleApiSchema, "merchant rule");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [category] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.id, parsed.data.categoryId), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .limit(1);

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const [account] = parsed.data.accountId
    ? await db
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.ledgerId, context.ledger.id), isNull(accounts.deletedAt)))
        .limit(1)
    : [];

  if (parsed.data.accountId && !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const [rule] = await db
    .insert(merchantRules)
    .values({
      ledgerId: context.ledger.id,
      accountId: account?.id,
      categoryId: category.id,
      name: parsed.data.name,
      matchType: parsed.data.matchType,
      matchValue: parsed.data.matchValue,
      normalizedMatchValue: normalizeRuleMatchValue(parsed.data.matchValue),
      priority: parsed.data.priority,
      isActive: true,
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "merchant_rule.created",
    entityType: "merchant_rule",
    entityId: rule.id,
    after: rule,
  });

  return NextResponse.json(
    {
      rule: {
        ...rule,
        categoryName: category.name,
        accountName: account?.name ?? null,
      },
    },
    { status: 201 },
  );
}

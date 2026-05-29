import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, categories } from "@/lib/db/schema";
import { createCategorySchema, slugifyCategoryName, updateCategoryApiSchema } from "@/lib/finance/rules";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function GET() {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      flowType: categories.flowType,
      color: categories.color,
      isSystem: categories.isSystem,
      isArchived: categories.isArchived,
    })
    .from(categories)
    .where(and(eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return NextResponse.json({ categories: rows });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "categories");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, createCategorySchema, "category");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const baseSlug = slugifyCategoryName(parsed.data.name);
  const [category] = await db
    .insert(categories)
    .values({
      ledgerId: context.ledger.id,
      name: parsed.data.name,
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      flowType: parsed.data.flowType,
      color: parsed.data.color,
      icon: "tag",
      isSystem: false,
    })
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "category.created",
    entityType: "category",
    entityId: category.id,
    after: category,
  });

  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "categories");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, updateCategoryApiSchema, "category update");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [existingCategory] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, parsed.data.id), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .limit(1);

  if (!existingCategory) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (existingCategory.isSystem) {
    return NextResponse.json({ error: "System categories cannot be edited in V1." }, { status: 409 });
  }

  const nextName = parsed.data.name ?? existingCategory.name;
  const update = {
    name: nextName,
    slug: parsed.data.name ? `${slugifyCategoryName(nextName)}-${Date.now().toString(36)}` : existingCategory.slug,
    flowType: parsed.data.flowType ?? existingCategory.flowType,
    color: parsed.data.color ?? existingCategory.color,
    isArchived: parsed.data.isArchived ?? existingCategory.isArchived,
    updatedAt: new Date(),
  };

  const [category] = await db
    .update(categories)
    .set(update)
    .where(and(eq(categories.id, parsed.data.id), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "category.updated",
    entityType: "category",
    entityId: category.id,
    before: existingCategory,
    after: category,
  });

  return NextResponse.json({ category });
}

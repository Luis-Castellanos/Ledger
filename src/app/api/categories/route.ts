import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, categories } from "@/lib/db/schema";
import { createCategorySchema, slugifyCategoryName } from "@/lib/finance/rules";

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

  const parsed = createCategorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
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

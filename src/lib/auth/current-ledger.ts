import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditEvents, categories, ledgers, users } from "@/lib/db/schema";
import { defaultCategoryTree } from "@/lib/finance/default-categories";

export async function getOrCreateCurrentLedger() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return null;
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? `${userId}@clerk.local`;
  const displayName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || null;
  const db = getDb();

  const [user] = await db
    .insert(users)
    .values({
      authProviderSubject: userId,
      email,
      displayName,
      avatarUrl: clerkUser?.imageUrl ?? null,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [users.authProvider, users.authProviderSubject],
      set: {
        email,
        displayName,
        avatarUrl: clerkUser?.imageUrl ?? null,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  const [existingLedger] = await db.select().from(ledgers).where(and(eq(ledgers.ownerUserId, user.id), isNull(ledgers.deletedAt))).limit(1);

  if (existingLedger) {
    return { user, ledger: existingLedger };
  }

  const [insertedLedger] = await db
    .insert(ledgers)
    .values({
      ownerUserId: user.id,
      name: "Personal ledger",
    })
    .onConflictDoNothing({
      target: ledgers.ownerUserId,
      where: sql`${ledgers.deletedAt} is null`,
    })
    .returning();

  const ledger =
    insertedLedger ??
    (await db.select().from(ledgers).where(and(eq(ledgers.ownerUserId, user.id), isNull(ledgers.deletedAt))).limit(1))[0];

  if (!ledger) {
    throw new Error("Unable to create or load the current user's ledger.");
  }

  if (!insertedLedger) {
    return { user, ledger };
  }

  await seedDefaultLedgerData({ actorUserId: user.id, ledgerId: ledger.id });

  return { user, ledger };
}

async function seedDefaultLedgerData({ actorUserId, ledgerId }: { actorUserId: string; ledgerId: string }) {
  const db = getDb();
  const [existingCategory] = await db.select({ id: categories.id }).from(categories).where(eq(categories.ledgerId, ledgerId)).limit(1);

  if (existingCategory) {
    return;
  }

  const parentCategories = await db
    .insert(categories)
    .values(
      defaultCategoryTree.map((category, index) => ({
        ledgerId,
        name: category.name,
        slug: category.slug,
        flowType: category.flowType,
        color: category.color,
        icon: category.icon,
        sortOrder: index,
        isSystem: true,
      })),
    )
    .returning({ id: categories.id, slug: categories.slug });

  const parentIdBySlug = new Map(parentCategories.map((category) => [category.slug, category.id]));
  const childValues = defaultCategoryTree.flatMap((parent, parentIndex) =>
    (parent.children ?? []).map((child, childIndex) => ({
      ledgerId,
      parentId: parentIdBySlug.get(parent.slug) ?? null,
      name: child.name,
      slug: child.slug,
      flowType: child.flowType,
      color: child.color,
      icon: child.icon,
      sortOrder: parentIndex * 100 + childIndex,
      isSystem: true,
    })),
  );

  if (childValues.length > 0) {
    await db.insert(categories).values(childValues);
  }

  await db.insert(auditEvents).values({
    ledgerId,
    actorUserId,
    action: "ledger.defaults_seeded",
    entityType: "ledger",
    entityId: ledgerId,
    after: { categoryCount: parentCategories.length + childValues.length },
  });
}

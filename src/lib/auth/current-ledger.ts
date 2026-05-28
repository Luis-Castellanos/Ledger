import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { ledgers, users } from "@/lib/db/schema";

export async function getOrCreateCurrentLedger() {
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

  const [existingLedger] = await db.select().from(ledgers).where(eq(ledgers.ownerUserId, user.id)).limit(1);

  if (existingLedger) {
    return { user, ledger: existingLedger };
  }

  const [ledger] = await db
    .insert(ledgers)
    .values({
      ownerUserId: user.id,
      name: "Personal ledger",
    })
    .returning();

  return { user, ledger };
}

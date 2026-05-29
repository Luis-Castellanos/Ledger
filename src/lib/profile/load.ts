import "server-only";

import { eq } from "drizzle-orm";
import { DEFAULT_SECTIONS, normalizeSections } from "@/components/nav-config";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { ledgerSettings } from "@/lib/db/schema";
import { DEFAULT_AVATAR_GRADIENT, type AvatarKind, type NavSection, type ProfileData } from "./avatars";

const NAME_KEY = "profile.name";
const AVATAR_KIND_KEY = "profile.avatar_kind";
const AVATAR_GRADIENT_KEY = "profile.avatar_gradient";
const AVATAR_IMAGE_KEY = "profile.avatar_image";
const NAV_HIDDEN_KEY = "nav.hidden";
const NAV_LAYOUT_KEY = "nav.layout";

const VALID_AVATAR_KINDS = new Set<AvatarKind>(["gradient", "solid", "image"]);

export type ProfilePatch = {
  name?: string;
  avatarKind?: AvatarKind;
  avatarGradient?: string;
  avatarImage?: string | null;
  navHidden?: string[];
  navLayout?: NavSection[];
};

async function getSettingMap(ledgerId: string) {
  const rows = await getDb().select().from(ledgerSettings).where(eq(ledgerSettings.ledgerId, ledgerId));
  return new Map(rows.map((row) => [row.key, row.value]));
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asAvatarKind(value: unknown): AvatarKind {
  return typeof value === "string" && VALID_AVATAR_KINDS.has(value as AvatarKind) ? (value as AvatarKind) : "gradient";
}

function asLayout(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_SECTIONS;
  }

  return normalizeSections(
    value
      .filter((section): section is { id?: unknown; label?: unknown; items?: unknown } => typeof section === "object" && section !== null)
      .map((section, index) => ({
        id: typeof section.id === "string" ? section.id : `section-${index}`,
        label: typeof section.label === "string" ? section.label : "Section",
        items: asStringArray(section.items),
      })),
  );
}

export async function getProfile(): Promise<ProfileData | null> {
  const context = await getOrCreateCurrentLedger();
  if (!context) {
    return null;
  }

  const settings = await getSettingMap(context.ledger.id);
  const fallbackName = context.user.displayName || context.ledger.name || "Personal ledger";

  return {
    name: asString(settings.get(NAME_KEY), fallbackName),
    email: context.user.email,
    avatarKind: asAvatarKind(settings.get(AVATAR_KIND_KEY)),
    avatarGradient: asString(settings.get(AVATAR_GRADIENT_KEY), DEFAULT_AVATAR_GRADIENT),
    avatarImage: asNullableString(settings.get(AVATAR_IMAGE_KEY)) || context.user.avatarUrl || null,
    navHidden: asStringArray(settings.get(NAV_HIDDEN_KEY)),
    navLayout: asLayout(settings.get(NAV_LAYOUT_KEY)),
  };
}

async function setSetting(ledgerId: string, key: string, value: unknown) {
  await getDb()
    .insert(ledgerSettings)
    .values({ ledgerId, key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [ledgerSettings.ledgerId, ledgerSettings.key],
      set: { value, updatedAt: new Date() },
    });
}

export async function setProfile(patch: ProfilePatch): Promise<ProfileData | null> {
  const context = await getOrCreateCurrentLedger();
  if (!context) {
    return null;
  }

  const writes: Promise<void>[] = [];

  if (patch.name !== undefined) {
    writes.push(setSetting(context.ledger.id, NAME_KEY, patch.name.trim().slice(0, 120) || context.ledger.name));
  }
  if (patch.avatarKind !== undefined) {
    writes.push(setSetting(context.ledger.id, AVATAR_KIND_KEY, VALID_AVATAR_KINDS.has(patch.avatarKind) ? patch.avatarKind : "gradient"));
  }
  if (patch.avatarGradient !== undefined) {
    writes.push(setSetting(context.ledger.id, AVATAR_GRADIENT_KEY, patch.avatarGradient));
  }
  if (patch.avatarImage !== undefined) {
    writes.push(setSetting(context.ledger.id, AVATAR_IMAGE_KEY, patch.avatarImage ?? ""));
  }
  if (patch.navHidden !== undefined) {
    writes.push(setSetting(context.ledger.id, NAV_HIDDEN_KEY, asStringArray(patch.navHidden)));
  }
  if (patch.navLayout !== undefined) {
    writes.push(setSetting(context.ledger.id, NAV_LAYOUT_KEY, normalizeSections(patch.navLayout)));
  }

  await Promise.all(writes);

  return getProfile();
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { setProfile, type ProfilePatch, getProfile } from "@/lib/profile/load";

const navSectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  items: z.array(z.string().trim().min(1).max(80)).max(20),
});

const profilePatchSchema = z.object({
  name: z.string().trim().max(120).optional(),
  avatarKind: z.enum(["gradient", "solid", "image"]).optional(),
  avatarGradient: z.string().trim().max(80).optional(),
  avatarImage: z.string().max(512_000).nullable().optional(),
  navHidden: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  navLayout: z.array(navSectionSchema).max(12).optional(),
});

export async function GET() {
  const data = await getProfile();

  if (!data) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const currentProfile = await getProfile();

  if (!currentProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = profilePatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = await setProfile(parsed.data satisfies ProfilePatch);

  return NextResponse.json({ data });
}

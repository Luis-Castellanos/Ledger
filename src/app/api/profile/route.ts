import { NextResponse } from "next/server";
import { setProfile, type ProfilePatch, getProfile } from "@/lib/profile/load";

export async function GET() {
  const data = await getProfile();

  if (!data) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as ProfilePatch;
  const data = await setProfile(body);

  if (!data) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data });
}

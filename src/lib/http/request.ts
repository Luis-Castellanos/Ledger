import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export type ParsedJsonRequest<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function parseJsonRequest<T>(request: Request, schema: ZodType<T>, label: string): Promise<ParsedJsonRequest<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: `Malformed ${label} JSON` }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: `Invalid ${label}`, issues: parsed.error.flatten().fieldErrors }, { status: 400 }),
    };
  }

  return { data: parsed.data, ok: true };
}

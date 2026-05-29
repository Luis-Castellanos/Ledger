import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFormDataRequest, parseJsonRequest } from "./request";

const schema = z.object({
  name: z.string().min(1),
});

describe("parseJsonRequest", () => {
  it("returns typed data for valid JSON", async () => {
    const parsed = await parseJsonRequest(new Request("https://example.com", { body: JSON.stringify({ name: "Ledger" }), method: "POST" }), schema, "profile");

    expect(parsed).toEqual({ data: { name: "Ledger" }, ok: true });
  });

  it("returns a 400 response for malformed JSON", async () => {
    const parsed = await parseJsonRequest(new Request("https://example.com", { body: "{", method: "POST" }), schema, "profile");

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      await expect(parsed.response.json()).resolves.toEqual({ error: "Malformed profile JSON" });
    }
  });

  it("returns a 400 response for schema errors", async () => {
    const parsed = await parseJsonRequest(new Request("https://example.com", { body: JSON.stringify({ name: "" }), method: "POST" }), schema, "profile");

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      const body = (await parsed.response.json()) as { error: string; issues: Record<string, unknown> };
      expect(body.error).toBe("Invalid profile");
      expect(body.issues.name).toBeDefined();
    }
  });

  it("returns form data for multipart requests", async () => {
    const formData = new FormData();
    formData.append("name", "Ledger");

    const parsed = await parseFormDataRequest(new Request("https://example.com", { body: formData, method: "POST" }), "upload");

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.get("name")).toBe("Ledger");
    }
  });

  it("returns a 400 response for malformed form data", async () => {
    const parsed = await parseFormDataRequest(
      new Request("https://example.com", {
        body: "not multipart",
        headers: { "Content-Type": "multipart/form-data; boundary=missing" },
        method: "POST",
      }),
      "upload",
    );

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      await expect(parsed.response.json()).resolves.toEqual({ error: "Malformed upload form data" });
    }
  });
});

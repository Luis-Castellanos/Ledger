import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAccounts } from "./accounts/route";
import { GET as getExports, POST as postExports } from "./exports/route";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";

vi.mock("@/lib/auth/current-ledger", () => ({
  getOrCreateCurrentLedger: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}));

const mockedGetCurrentLedger = vi.mocked(getOrCreateCurrentLedger);

describe("API route authorization and method guards", () => {
  beforeEach(() => {
    mockedGetCurrentLedger.mockReset();
  });

  it("returns 401 for protected account reads without a ledger context", async () => {
    mockedGetCurrentLedger.mockResolvedValue(null);

    const response = await getAccounts();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("keeps export GET non-mutating", async () => {
    const response = getExports();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    await expect(response.json()).resolves.toEqual({ error: "Use POST to generate exports." });
    expect(mockedGetCurrentLedger).not.toHaveBeenCalled();
  });

  it("returns 401 for export POST without a ledger context", async () => {
    mockedGetCurrentLedger.mockResolvedValue(null);

    const response = await postExports(
      new Request("https://praxisledger.app/api/exports", {
        body: JSON.stringify({ format: "backup_package" }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});

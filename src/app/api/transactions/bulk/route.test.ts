import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { resetRateLimitStore } from "@/lib/security/rate-limit";
import { POST } from "./route";

vi.mock("@/lib/auth/current-ledger", () => ({
  getOrCreateCurrentLedger: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}));

const mockedGetCurrentLedger = vi.mocked(getOrCreateCurrentLedger);
const mockedGetDb = vi.mocked(getDb);

const ledgerContext = {
  user: { id: "550e8400-e29b-41d4-a716-446655440010" },
  ledger: { id: "550e8400-e29b-41d4-a716-446655440011" },
};

const transactionId = "550e8400-e29b-41d4-a716-446655440012";
const categoryId = "550e8400-e29b-41d4-a716-446655440013";

describe("bulk transaction updates", () => {
  beforeEach(() => {
    resetRateLimitStore();
    mockedGetCurrentLedger.mockReset();
    mockedGetDb.mockReset();
    mockedGetCurrentLedger.mockResolvedValue(ledgerContext as Awaited<ReturnType<typeof getOrCreateCurrentLedger>>);
  });

  it("rejects category ids outside the current ledger before updating transactions", async () => {
    const db = mockDb({
      categoryRows: [],
    });
    mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const response = await POST(
      new NextRequest("https://praxisledger.app/api/transactions/bulk", {
        method: "POST",
        body: JSON.stringify({
          ids: [transactionId],
          categoryId,
        }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Category not found" });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("allows verified current-ledger category ids", async () => {
    const db = mockDb({
      categoryRows: [{ id: categoryId }],
      existingTransactions: [{ id: transactionId }],
      updatedTransactions: [{ id: transactionId }],
    });
    mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const response = await POST(
      new NextRequest("https://praxisledger.app/api/transactions/bulk", {
        method: "POST",
        body: JSON.stringify({
          ids: [transactionId],
          categoryId,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      updated: 1,
      applied: [{ id: transactionId }],
    });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});

function mockDb({
  categoryRows = [],
  existingTransactions = [],
  updatedTransactions = [],
}: {
  categoryRows?: Array<{ id: string }>;
  existingTransactions?: Array<{ id: string }>;
  updatedTransactions?: Array<{ id: string }>;
}) {
  const select = vi
    .fn()
    .mockImplementationOnce(() => selectChainWithLimit(categoryRows))
    .mockImplementationOnce(() => selectChain(existingTransactions));

  return {
    select,
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updatedTransactions),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  };
}

function selectChainWithLimit<T>(rows: T[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => rows),
      })),
    })),
  };
}

function selectChain<T>(rows: T[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(async () => rows),
    })),
  };
}

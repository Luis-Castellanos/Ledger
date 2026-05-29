import { afterEach, describe, expect, it, vi } from "vitest";

describe("document storage policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows metadata-only document rows outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const policy = await import("./document-storage");

    expect(policy.canCreateDocumentMetadataOnly()).toBe(true);
  });

  it("blocks metadata-only document rows in production by default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOCUMENT_STORAGE_MODE", "");
    const policy = await import("./document-storage");

    expect(policy.canCreateDocumentMetadataOnly()).toBe(false);
  });

  it("allows production metadata-only document rows only when explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOCUMENT_STORAGE_MODE", "metadata-only");
    const policy = await import("./document-storage");

    expect(policy.canCreateDocumentMetadataOnly()).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { detectDocumentType, labelizeDocumentValue } from "./document";

describe("detectDocumentType", () => {
  it("detects common statement families from filenames", () => {
    expect(detectDocumentType("Fidelity_Brokerage_2026-05.pdf")).toEqual({ type: "investment", issuer: "fidelity", deferred: false });
    expect(detectDocumentType("Chase_Credit_Card_2026-04.pdf")).toEqual({ type: "credit_card", issuer: "chase", deferred: false });
    expect(detectDocumentType("paystub-2026-05-15.pdf")).toEqual({ type: "paystub", issuer: null, deferred: true });
    expect(detectDocumentType("mortgage-loan.pdf")).toEqual({ type: "loan", issuer: null, deferred: true });
  });

  it("defers non-PDF files", () => {
    expect(detectDocumentType("transactions.csv", "text/csv")).toEqual({ type: "unknown", issuer: null, deferred: true });
  });
});

describe("labelizeDocumentValue", () => {
  it("formats enum values for display", () => {
    expect(labelizeDocumentValue("credit_card")).toBe("Credit Card");
    expect(labelizeDocumentValue("deferred")).toBe("Deferred");
  });
});

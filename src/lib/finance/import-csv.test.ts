import { describe, expect, it } from "vitest";
import { parseCsvImportRows } from "./import-csv";

describe("parseCsvImportRows", () => {
  it("parses amount-based CSV rows and marks within-file duplicates", () => {
    const rows = parseCsvImportRows(`Date,Description,Amount,Category
2026-05-27,"Coffee, Inc.",-4.25,Restaurants
2026-05-27,"Coffee, Inc.",-4.25,Restaurants`);

    expect(rows).toMatchObject([
      { rowNumber: 2, date: "2026-05-27", description: "Coffee, Inc.", amountMinor: -425, status: "needs_review" },
      { rowNumber: 3, amountMinor: -425, status: "duplicate" },
    ]);
  });

  it("parses debit and credit columns", () => {
    const rows = parseCsvImportRows(`Transaction Date,Name,Debit,Credit
05/27/2026,Grocer,12.34,
05/28/2026,Payroll,,100.00`);

    expect(rows).toMatchObject([
      { date: "2026-05-27", amount: "-12.34", amountMinor: -1234 },
      { date: "2026-05-28", amount: "100.00", amountMinor: 10000 },
    ]);
  });

  it("keeps invalid rows visible as rejected rows", () => {
    const rows = parseCsvImportRows(`Date,Description,Amount
not-a-date,,abc`);

    expect(rows).toEqual([
      {
        amount: "0",
        amountMinor: 0,
        category: "Uncategorized",
        date: "",
        description: "",
        rowNumber: 2,
        status: "rejected",
        validationMessage: "Missing date, description, or amount.",
      },
    ]);
  });
});

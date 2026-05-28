import { parseDollarAmount } from "./money";

export type ParsedCsvImportRow = {
  amount: string;
  amountMinor: number;
  category: string;
  date: string;
  description: string;
  rowNumber: number;
  status: "accepted" | "needs_review" | "duplicate" | "rejected";
  validationMessage?: string;
};

const dateHeaders = ["date", "transaction date", "posted date", "posting date"];
const descriptionHeaders = ["description", "merchant", "name", "payee", "memo"];
const amountHeaders = ["amount", "transaction amount"];
const debitHeaders = ["debit", "withdrawal", "withdrawals", "charge"];
const creditHeaders = ["credit", "deposit", "deposits", "payment"];
const categoryHeaders = ["category", "category name"];

export function parseCsvImportRows(text: string): ParsedCsvImportRow[] {
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0]?.map(normalizeHeader) ?? [];
  const seen = new Set<string>();
  const parsedRows: ParsedCsvImportRow[] = [];

  rows.slice(1).forEach((row, index) => {
    if (row.every((value) => value.trim() === "")) {
      return;
    }

    const rowNumber = index + 2;
    const rawDate = readColumn(row, headers, dateHeaders);
    const description = readColumn(row, headers, descriptionHeaders).trim();
    const category = readColumn(row, headers, categoryHeaders).trim() || "Uncategorized";
    const date = normalizeDate(rawDate);
    const amount = readAmount(row, headers);

    if (!date || !description || !amount) {
      parsedRows.push({
        amount: "0",
        amountMinor: 0,
        category,
        date: date || "",
        description,
        rowNumber,
        status: "rejected",
        validationMessage: "Missing date, description, or amount.",
      });
      return;
    }

    try {
      const amountMinor = parseDollarAmount(amount);
      const fingerprint = `${date}|${description.toLowerCase()}|${amountMinor}`;
      const status: ParsedCsvImportRow["status"] = seen.has(fingerprint) ? "duplicate" : "needs_review";
      seen.add(fingerprint);

      parsedRows.push({
        amount,
        amountMinor,
        category,
        date,
        description,
        rowNumber,
        status,
      });
    } catch {
      parsedRows.push({
        amount: "0",
        amountMinor: 0,
        category,
        date,
        description,
        rowNumber,
        status: "rejected",
        validationMessage: "Amount could not be parsed.",
      });
    }
  });

  return parsedRows;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows;
}

function readColumn(row: string[], headers: string[], candidates: string[]) {
  const index = headers.findIndex((header) => candidates.includes(header));
  return index >= 0 ? row[index] ?? "" : "";
}

function readAmount(row: string[], headers: string[]) {
  const amount = readColumn(row, headers, amountHeaders).trim();

  if (amount) {
    return amount;
  }

  const debit = readColumn(row, headers, debitHeaders).trim();
  const credit = readColumn(row, headers, creditHeaders).trim();

  if (debit) {
    return debit.startsWith("-") ? debit : `-${debit}`;
  }

  return credit;
}

function normalizeDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);

  if (!slashDate) {
    return "";
  }

  const [, month, day, year] = slashDate;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

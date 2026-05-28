export const exportFormats = ["transactions_csv", "backup_package"] as const;

export type ExportFormat = (typeof exportFormats)[number];

export function isExportFormat(value: string | null): value is ExportFormat {
  return exportFormats.includes(value as ExportFormat);
}

export function csvEscape(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function buildExportFilename(format: ExportFormat, createdAt = new Date()) {
  const date = createdAt.toISOString().slice(0, 10);
  const extension = format === "transactions_csv" ? "csv" : "json";
  return `vault-${format}-${date}.${extension}`;
}

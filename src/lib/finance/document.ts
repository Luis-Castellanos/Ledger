export const documentTypes = ["bank", "credit_card", "investment", "paystub", "loan", "tax", "insurance", "unknown"] as const;
export const documentStatuses = ["uploaded", "parsed", "deferred", "duplicate", "failed"] as const;
export const maxDocumentFilesPerRequest = 5;
export const maxDocumentUploadBytes = 10 * 1024 * 1024;

export type DocumentType = (typeof documentTypes)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type DocumentIntakeFile = Pick<File, "name" | "size" | "type">;

const allowedDocumentExtensions = new Set([".csv", ".pdf", ".txt"]);
const allowedDocumentMimeTypes = new Set(["text/csv", "application/csv", "application/pdf", "text/plain", "application/octet-stream"]);

const issuerMatchers = [
  { label: "fidelity", values: ["fidelity"] },
  { label: "chase", values: ["chase"] },
  { label: "american express", values: ["american express", "americanexpress", "amex"] },
  { label: "capital one", values: ["capital one", "capitalone"] },
  { label: "citi", values: ["citi"] },
  { label: "discover", values: ["discover"] },
  { label: "apple", values: ["apple"] },
  { label: "schwab", values: ["schwab"] },
] as const;

export function detectDocumentType(fileName: string, mimeType = ""): { type: DocumentType; issuer: string | null; deferred: boolean } {
  const lower = fileName.toLowerCase();
  const issuer = issuerMatchers.find((matcher) => matcher.values.some((value) => lower.includes(value)))?.label ?? null;

  if (!lower.endsWith(".pdf") && mimeType !== "application/pdf") {
    return { type: "unknown", issuer, deferred: true };
  }
  if (lower.includes("paystub") || lower.includes("payroll")) return { type: "paystub", issuer, deferred: true };
  if (lower.includes("credit") || lower.includes("card") || lower.includes("amex")) return { type: "credit_card", issuer, deferred: false };
  if (lower.includes("brokerage") || lower.includes("ira") || lower.includes("investment") || lower.includes("fidelity")) return { type: "investment", issuer, deferred: false };
  if (lower.includes("loan") || lower.includes("mortgage")) return { type: "loan", issuer, deferred: true };
  if (lower.includes("tax")) return { type: "tax", issuer, deferred: true };
  if (lower.includes("insurance")) return { type: "insurance", issuer, deferred: true };
  return { type: "bank", issuer, deferred: false };
}

export function labelizeDocumentValue(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function validateDocumentIntake(files: DocumentIntakeFile[]) {
  if (files.length === 0) {
    return { valid: false, error: "No files provided" } as const;
  }

  if (files.length > maxDocumentFilesPerRequest) {
    return { valid: false, error: `Upload ${maxDocumentFilesPerRequest} files or fewer at a time.` } as const;
  }

  for (const file of files) {
    if (file.size <= 0) {
      return { valid: false, error: `${file.name} is empty.` } as const;
    }

    if (file.size > maxDocumentUploadBytes) {
      return { valid: false, error: `${file.name} exceeds the 10 MB file limit.` } as const;
    }

    if (!isAllowedDocumentFile(file)) {
      return { valid: false, error: `${file.name} is not an allowed document type.` } as const;
    }
  }

  return { valid: true } as const;
}

function isAllowedDocumentFile(file: DocumentIntakeFile) {
  const lowerName = file.name.toLowerCase();
  const extensionAllowed = [...allowedDocumentExtensions].some((extension) => lowerName.endsWith(extension));
  const mimeTypeAllowed = allowedDocumentMimeTypes.has((file.type || "application/octet-stream").toLowerCase());
  return extensionAllowed && mimeTypeAllowed;
}

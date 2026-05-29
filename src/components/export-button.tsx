"use client";

import { useState, type ReactNode } from "react";
import type { ExportFormat } from "@/lib/finance/export";

type ExportButtonProps = {
  "aria-label": string;
  children: ReactNode;
  className: string;
  format: ExportFormat;
};

export function ExportButton({ "aria-label": ariaLabel, children, className, format }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function exportLedgerData() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { Accept: "application/octet-stream", "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        throw new Error("Export failed.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = extractDownloadFilename(response.headers.get("Content-Disposition")) ?? fallbackFilename(format);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button aria-label={ariaLabel} className={className} disabled={isExporting} onClick={() => void exportLedgerData()} type="button">
      {children}
    </button>
  );
}

function extractDownloadFilename(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1];
}

function fallbackFilename(format: ExportFormat) {
  return format === "transactions_csv" ? "vault-transactions.csv" : "vault-backup.json";
}

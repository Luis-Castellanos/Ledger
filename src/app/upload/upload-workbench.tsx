"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

type PreviewResult = {
  fileName: string;
  status: "ready" | "duplicate" | "deferred";
  detectedType: string;
  detectedIssuer: string | null;
  byteSize: number;
  message: string;
};

type PreviewResponse = {
  summary: { total: number; ready: number; duplicate: number; deferred: number };
  results: PreviewResult[];
};

type UploadResult = {
  id: string;
  fileName: string;
  status: string;
  detectedType: string;
  transactionCount: number;
  byteSize: number;
};

type UploadResponse = {
  summary: { total: number; uploaded: number; deferred: number; duplicate: number; failed: number };
  results: UploadResult[];
};

export function UploadWorkbench() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "upload" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(nextFiles: FileList | File[]) {
    const pdfs = Array.from(nextFiles).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    setError(pdfs.length ? null : "Choose at least one PDF.");
    setPreview(null);
    setResult(null);
    setFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}:${file.size}`));
      const merged = [...current];
      for (const file of pdfs) {
        const key = `${file.name}:${file.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
  }

  async function runPreview() {
    if (!files.length || busy) {
      return;
    }
    setBusy("preview");
    setError(null);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const response = await fetch("/api/documents/preview", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Preview failed.");
      }
      setPreview(payload as PreviewResponse);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFiles() {
    if (!files.length || busy) {
      return;
    }
    setBusy("upload");
    setError(null);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }
      setResult(payload as UploadResponse);
      setFiles([]);
      setPreview(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <section className="panel upload-workbench-panel">
          <div
            className={`upload-dropzone ${dragging ? "upload-dropzone-active" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="upload-dropzone-icon">
              <UploadCloud size={24} />
            </div>
            <strong>Drop PDFs here</strong>
            <span>Bank, card, brokerage, loan, and payroll statements</span>
            <input
              ref={inputRef}
              className="hidden"
              multiple
              accept="application/pdf,.pdf"
              type="file"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                }
                event.target.value = "";
              }}
            />
          </div>

          {files.length ? (
            <div className="upload-stage">
              <div className="panel-header">
                <div>
                  <p className="panel-label">Staged</p>
                  <h2 className="panel-title">{files.length} file{files.length === 1 ? "" : "s"}</h2>
                </div>
                <button className="secondary-action" type="button" onClick={() => setFiles([])}>
                  Clear
                </button>
              </div>
              <div className="upload-file-list">
                {files.map((file, index) => (
                  <div className="upload-file-row" key={`${file.name}:${file.size}`}>
                    <FileText size={16} />
                    <span>{file.name}</span>
                    <strong>{fmtBytes(file.size)}</strong>
                    <button aria-label={`Remove ${file.name}`} type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="upload-actions">
                <button className="secondary-action" disabled={busy !== null} type="button" onClick={() => void runPreview()}>
                  {busy === "preview" ? "Previewing" : "Preview"}
                </button>
                <button className="primary-action" disabled={busy !== null} type="button" onClick={() => void uploadFiles()}>
                  {busy === "upload" ? "Uploading" : "Upload"}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          {preview ? <UploadResults title="Preview" rows={preview.results} summary={`${preview.summary.ready} ready / ${preview.summary.duplicate} duplicate / ${preview.summary.deferred} deferred`} /> : null}
          {result ? <UploadResults title="Result" rows={result.results} summary={`${result.summary.uploaded} uploaded / ${result.summary.duplicate} duplicate / ${result.summary.deferred} deferred`} /> : null}
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <p className="panel-label">Queue</p>
          <div className="file-evidence-list">
            <div className="file-evidence-item">
              <span>Selected</span>
              <strong>{files.length}</strong>
            </div>
            <div className="file-evidence-item">
              <span>Previewed</span>
              <strong>{preview?.summary.total ?? 0}</strong>
            </div>
            <div className="file-evidence-item">
              <span>Uploaded</span>
              <strong>{result?.summary.uploaded ?? 0}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function UploadResults({ title, summary, rows }: { title: string; summary: string; rows: Array<PreviewResult | UploadResult> }) {
  return (
    <div className="upload-results">
      <div className="panel-header">
        <div>
          <p className="panel-label">{title}</p>
          <h2 className="panel-title">{summary}</h2>
        </div>
      </div>
      <div className="upload-file-list">
        {rows.map((row) => (
          <div className="upload-file-row" key={`${title}-${row.fileName}`}>
            <FileText size={16} />
            <span>{row.fileName}</span>
            <strong>{labelize(row.status)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

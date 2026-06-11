"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FolderOpen, Trash2, UploadCloud } from "lucide-react";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/lib/api/queries/accounts";
import { useDeleteDocument, useDocuments, useUpdateDocument, useUploadDocuments } from "@/lib/api/queries/imports";
import { cn } from "@/lib/utils";

export function DocumentsTab() {
  const documents = useDocuments();
  const accounts = useAccounts();
  const upload = useUploadDocuments();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) {
      return;
    }
    upload.mutate(list, {
      onSuccess: (result) => {
        const { uploaded, duplicate, failed, deferred } = result.summary;
        const parts = [
          uploaded ? `${uploaded} stored` : null,
          deferred ? `${deferred} deferred` : null,
          duplicate ? `${duplicate} duplicate` : null,
          failed ? `${failed} failed` : null,
        ].filter(Boolean);
        toast[failed ? "warning" : "success"](`Upload finished — ${parts.join(", ")}`);
      },
      onError: (error) => toast.error(error.message || "Upload failed"),
    });
  }

  return (
    <div className="space-y-4">
      <div
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload statement files"
      >
        <UploadCloud className="size-6 text-muted-foreground/60" strokeWidth={1.5} />
        <p className="text-sm font-medium">{upload.isPending ? "Uploading…" : "Drop statement files here, or click to choose"}</p>
        <p className="text-xs text-muted-foreground">PDF, CSV, or TXT · up to 5 files · 10 MB each · stored as evidence, parsing comes later</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.txt"
          className="hidden"
          aria-label="Upload statement files"
          onChange={(event) => {
            if (event.target.files) {
              handleFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
      </div>

      {documents.isPending ? (
        <PageSkeleton rows={4} />
      ) : documents.isError ? (
        <ErrorState message={documents.error.message} onRetry={() => void documents.refetch()} />
      ) : documents.data.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents on file"
          description="Source statements you upload are kept as evidence behind the ledger."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul>
            {documents.data.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{document.fileName}</span>
                    <Badge variant="outline" className="h-4 shrink-0 px-1 text-[10px] capitalize">
                      {document.detectedType.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 shrink-0 px-1 text-[10px]",
                        document.status === "uploaded" && "border-positive/40 text-positive",
                        document.status === "deferred" && "border-warning/40 text-warning",
                        document.status === "failed" && "border-destructive/40 text-destructive",
                      )}
                    >
                      {document.status}
                    </Badge>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {[
                      document.detectedIssuer,
                      `${Math.max(1, Math.round(document.byteSize / 1024))} KB`,
                      format(new Date(document.uploadedAt), "MMM d, yyyy"),
                      document.statementPeriod,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Select
                    value={document.accountId ?? "__none"}
                    onValueChange={(value) =>
                      update.mutate(
                        { id: document.id, accountId: value === "__none" ? null : value },
                        { onError: (error) => toast.error(error.message || "Could not assign the account") },
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="h-7 w-36 text-xs" aria-label={`Account for ${document.fileName}`}>
                      <SelectValue placeholder="Assign account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No account</SelectItem>
                      {(accounts.data ?? []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${document.fileName}`}
                    onClick={() =>
                      remove.mutate(document.id, {
                        onSuccess: () => toast.success(`${document.fileName} removed`),
                        onError: (error) => toast.error(error.message || "Could not delete the document"),
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

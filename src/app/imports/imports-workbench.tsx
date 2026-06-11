"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, FileInput, History, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/client";
import { useAccounts } from "@/lib/api/queries/accounts";
import {
  useCommitImport,
  useCreateImportMapping,
  useImportMappings,
  useImports,
  useRollbackImport,
  useStageImport,
  useUpdateImportRow,
  type ImportRow,
} from "@/lib/api/queries/imports";
import { parseCsvImportRows, type CsvImportColumnMapping, type ParsedCsvImportRow } from "@/lib/finance/import-csv";
import { cn } from "@/lib/utils";
import { DocumentsTab } from "./documents-tab";

type TabKey = "import" | "history" | "documents";

export function ImportsWorkbench({ initialTab }: { initialTab: TabKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const accounts = useAccounts();

  const unauthorized = accounts.error instanceof ApiError && accounts.error.status === 401;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader eyebrow="Data in" title="Imports" description="Statements are the source material — bring them in here." />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to import data</p>
          <AuthControls />
        </div>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = value as TabKey;
            setTab(next);
            router.replace(`${pathname}${next === "import" ? "" : `?tab=${next}`}`, { scroll: false });
          }}
        >
          <TabsList>
            <TabsTrigger value="import">
              <FileInput /> Import CSV
            </TabsTrigger>
            <TabsTrigger value="history">
              <History /> History
            </TabsTrigger>
            <TabsTrigger value="documents">
              <Upload /> Documents
            </TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="pt-2">
            <ImportStepper />
          </TabsContent>
          <TabsContent value="history" className="pt-2">
            <HistoryTab />
          </TabsContent>
          <TabsContent value="documents" className="pt-2">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ---------------------------------- stepper --------------------------------- */

type StepState =
  | { step: "setup" }
  | { step: "parsed"; fileName: string; fileText: string; rows: ParsedCsvImportRow[] }
  | { step: "staged"; importId: string }
  | { step: "done"; committedCount: number; duplicateCount: number };

const EMPTY_MAPPING: CsvImportColumnMapping = {};

function ImportStepper() {
  const accounts = useAccounts();
  const mappings = useImportMappings();
  const stage = useStageImport();
  const commit = useCommitImport();
  const createMapping = useCreateImportMapping();

  const [state, setState] = useState<StepState>({ step: "setup" });
  const [accountId, setAccountId] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [customMapping, setCustomMapping] = useState<CsvImportColumnMapping>(EMPTY_MAPPING);
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [saveMapping, setSaveMapping] = useState(false);
  const [mappingName, setMappingName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAccounts = (accounts.data ?? []).filter((account) => account.isActive);
  const activeMapping = useMemo<CsvImportColumnMapping>(() => {
    if (showMappingEditor) {
      return customMapping;
    }
    return (mappings.data ?? []).find((mapping) => mapping.id === mappingId)?.mapping ?? EMPTY_MAPPING;
  }, [showMappingEditor, customMapping, mappings.data, mappingId]);

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseCsvImportRows(text, activeMapping);
    if (rows.length === 0) {
      toast.error("No rows found — is this a CSV export with a header row?");
      return;
    }
    setState({ step: "parsed", fileName: file.name, fileText: text, rows });
    if (rows.every((row) => row.status === "rejected")) {
      setShowMappingEditor(true);
      toast.warning("No rows parsed cleanly — map the column headers below and re-parse.");
    }
  }

  function reparse() {
    if (state.step !== "parsed") {
      return;
    }
    const rows = parseCsvImportRows(state.fileText, activeMapping);
    setState({ ...state, rows });
  }

  function stageRows() {
    if (state.step !== "parsed" || !accountId) {
      return;
    }
    if (saveMapping && mappingName.trim() && showMappingEditor) {
      createMapping.mutate(
        { name: mappingName.trim(), accountId, mapping: customMapping },
        { onError: (error) => toast.error(error.message || "Could not save the mapping") },
      );
    }
    stage.mutate(
      {
        accountId,
        filename: state.fileName,
        ...(mappingId ? { savedMappingId: mappingId } : {}),
        rows: state.rows.map((row) => ({
          rowNumber: row.rowNumber,
          date: row.date || "1970-01-01",
          description: row.description || "(empty)",
          amount: row.amount || "0",
          category: row.category || "Uncategorized",
          status: row.status,
        })),
      },
      {
        onSuccess: (response) => {
          toast.success("Rows staged — review them, then commit.");
          setState({ step: "staged", importId: response.import.id });
        },
        onError: (error) => toast.error(error.message || "Could not stage the import"),
      },
    );
  }

  function commitStaged(importId: string) {
    commit.mutate(importId, {
      onSuccess: (result) => {
        setState({ step: "done", committedCount: result.committedCount, duplicateCount: result.duplicateCount });
      },
      onError: (error) => toast.error(error.message || "Commit failed"),
    });
  }

  if (state.step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="size-8 text-positive" strokeWidth={1.5} />
          <p className="font-display text-2xl font-semibold">
            {state.committedCount} transaction{state.committedCount === 1 ? "" : "s"} committed
          </p>
          {state.duplicateCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {state.duplicateCount} duplicate{state.duplicateCount === 1 ? " was" : "s were"} skipped — already in the ledger.
            </p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button asChild size="sm">
              <Link href="/review">
                Review them <ArrowRight />
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setState({ step: "setup" })}>
              Import another file
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.step === "staged") {
    return <StagedReview importId={state.importId} onCommit={() => commitStaged(state.importId)} committing={commit.isPending} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="label-caps">Step 1 — Where does this statement belong?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="label-caps">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full" aria-label="Import account">
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {openAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="label-caps">Saved column mapping (optional)</Label>
              <Select value={mappingId || "__none"} onValueChange={(value) => setMappingId(value === "__none" ? "" : value)}>
                <SelectTrigger className="w-full" aria-label="Saved mapping">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Auto-detect headers</SelectItem>
                  {(mappings.data ?? []).map((mapping) => (
                    <SelectItem key={mapping.id} value={mapping.id}>
                      {mapping.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center transition-colors",
              accountId ? "cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03]" : "opacity-50",
            )}
            onClick={() => accountId && fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file && accountId) {
                void handleFile(file);
              }
            }}
            role="button"
            aria-label="Stage CSV file"
            tabIndex={accountId ? 0 : -1}
          >
            <Upload className="size-6 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="text-sm font-medium">{accountId ? "Drop a CSV here, or click to choose" : "Pick an account first"}</p>
            <p className="text-xs text-muted-foreground">Bank and card statement exports · headers auto-detected</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Stage CSV file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFile(file);
                }
                event.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      {state.step === "parsed" ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label-caps">Step 2 — Preview {state.fileName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {state.rows.length} rows · {state.rows.filter((row) => row.status === "rejected").length} rejected ·{" "}
                {state.rows.filter((row) => row.status === "duplicate").length} in-file duplicates
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowMappingEditor((value) => !value)}>
                Adjust columns
              </Button>
              <Button size="sm" onClick={stageRows} disabled={stage.isPending || state.rows.every((row) => row.status === "rejected")}>
                {stage.isPending ? "Staging…" : "Stage rows"} <ArrowRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showMappingEditor ? (
              <div className="grid gap-3 rounded-lg border border-border p-3">
                <p className="label-caps">Column headers in your file</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(["date", "description", "amount", "debit", "credit", "category"] as const).map((key) => (
                    <div key={key} className="grid gap-1">
                      <Label htmlFor={`map-${key}`} className="text-xs capitalize text-muted-foreground">
                        {key}
                      </Label>
                      <Input
                        id={`map-${key}`}
                        value={customMapping[key] ?? ""}
                        onChange={(event) => setCustomMapping((current) => ({ ...current, [key]: event.target.value || undefined }))}
                        placeholder={key === "date" ? "Posted Date" : ""}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" onClick={reparse}>
                    <RotateCcw /> Re-parse
                  </Button>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={saveMapping} onCheckedChange={(checked) => setSaveMapping(checked === true)} />
                    Save this mapping
                  </label>
                  {saveMapping ? (
                    <Input
                      value={mappingName}
                      onChange={(event) => setMappingName(event.target.value)}
                      placeholder="Bank CSV"
                      className="h-8 w-40 text-sm"
                      aria-label="Mapping name"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            <PreviewTable rows={state.rows} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PreviewTable({ rows }: { rows: ParsedCsvImportRow[] }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-left">
            <th className="label-caps px-3 py-2 font-semibold">Date</th>
            <th className="label-caps px-3 py-2 font-semibold">Description</th>
            <th className="label-caps px-3 py-2 text-right font-semibold">Amount</th>
            <th className="label-caps px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNumber} className={cn("border-b border-border/60 last:border-b-0", row.status === "rejected" && "opacity-50")}>
              <td className="whitespace-nowrap px-3 py-1.5 font-money text-xs">{row.date || "—"}</td>
              <td className="max-w-64 truncate px-3 py-1.5">{row.description || row.validationMessage || "—"}</td>
              <td className="px-3 py-1.5 text-right">
                <Money amountMinor={row.amountMinor} className="text-xs" />
              </td>
              <td className="px-3 py-1.5">
                <RowStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowStatusBadge({ status }: { status: ImportRow["status"] }) {
  const styles: Record<ImportRow["status"], string> = {
    accepted: "border-positive/40 text-positive",
    needs_review: "border-warning/40 text-warning",
    duplicate: "border-transfer/40 text-transfer",
    rejected: "border-destructive/40 text-destructive",
  };
  return (
    <Badge variant="outline" className={cn("h-4 px-1 text-[10px]", styles[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function StagedReview({ importId, onCommit, committing }: { importId: string; onCommit: () => void; committing: boolean }) {
  const imports = useImports(importId);
  const updateRow = useUpdateImportRow();

  if (imports.isPending) {
    return <PageSkeleton rows={8} />;
  }
  if (imports.isError) {
    return <ErrorState message={imports.error.message} onRetry={() => void imports.refetch()} />;
  }

  const rows = imports.data.rows;
  const committable = rows.filter((row) => row.status === "accepted" || row.status === "needs_review").length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="label-caps">Step 3 — Confirm what enters the ledger</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {committable} of {rows.length} rows will commit · duplicates and rejected rows stay out
          </p>
        </div>
        <Button size="sm" onClick={onCommit} disabled={committing || committable === 0}>
          {committing ? "Committing…" : `Commit ${committable} rows`}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left">
                <th className="label-caps px-3 py-2 font-semibold">Date</th>
                <th className="label-caps px-3 py-2 font-semibold">Description</th>
                <th className="label-caps px-3 py-2 text-right font-semibold">Amount</th>
                <th className="label-caps px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-1.5 font-money text-xs">{row.date}</td>
                  <td className="max-w-64 truncate px-3 py-1.5">{row.description}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Money amountMinor={row.amountMinor} className="text-xs" />
                  </td>
                  <td className="px-3 py-1.5">
                    <Select
                      value={row.status}
                      onValueChange={(value) =>
                        updateRow.mutate(
                          { id: row.id, status: value as ImportRow["status"] },
                          { onError: (error) => toast.error(error.message || "Could not update the row") },
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-32 text-xs" aria-label={`Status for row ${row.rowNumber}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="needs_review">Needs review</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------- history --------------------------------- */

function HistoryTab() {
  const imports = useImports();
  const rollback = useRollbackImport();

  if (imports.isPending) {
    return <PageSkeleton rows={5} />;
  }
  if (imports.isError) {
    return <ErrorState message={imports.error.message} onRetry={() => void imports.refetch()} />;
  }

  const batches = imports.data.batches;

  if (batches.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No imports yet"
        description="Staged and committed statement imports show up here, with one-click rollback."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul>
        {batches.map((batch) => (
          <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{batch.filename}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 px-1 text-[10px]",
                    batch.status === "committed" && "border-positive/40 text-positive",
                    batch.status === "staged" && "border-warning/40 text-warning",
                    batch.status === "rolled_back" && "text-muted-foreground",
                  )}
                >
                  {batch.status.replace("_", " ")}
                </Badge>
              </span>
              <span className="block text-xs text-muted-foreground">
                {batch.account} · {batch.uploadedAt} · {batch.acceptedRows} accepted / {batch.rejectedRows} rejected
              </span>
            </span>
            {batch.status === "committed" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={rollback.isPending}
                onClick={() =>
                  rollback.mutate(batch.id, {
                    onSuccess: (result) => toast.success(`${result.rolledBackCount} transactions rolled back`),
                    onError: (error) => toast.error(error.message || "Rollback failed"),
                  })
                }
              >
                <RotateCcw /> Roll back
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, ListChecks, RotateCcw, Search, ShieldAlert, Upload } from "lucide-react";
import { sampleAccounts } from "@/lib/finance/account-sample-data";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { parseCsvImportRows, type CsvImportColumnMapping, type ParsedCsvImportRow } from "@/lib/finance/import-csv";
import { sampleImportBatches, sampleImportRows, type ImportBatch, type ImportPreviewRow, type ImportRowStatus } from "@/lib/finance/import-sample-data";
import { formatMoney } from "@/lib/finance/money";
import { canUseLocalFallback, dataSourceLabel, dataSourceStatusClass, demoFallback, fallbackDataSource, productionFallbackMessage, type DataSourceState } from "@/lib/demo-fallback";

const categories = ["Uncategorized", ...defaultCategoryTree.flatMap((parent) => [parent.name, ...(parent.children ?? []).map((child) => child.name)])];
const statuses = [
  { label: "Accepted", value: "accepted" },
  { label: "Needs review", value: "needs_review" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Rejected", value: "rejected" },
] satisfies { label: string; value: ImportRowStatus }[];
const fallbackImportMappings: ImportMappingSummary[] = [
  {
    id: "default-csv",
    accountId: null,
    name: "Standard CSV",
    mapping: {
      date: "Date",
      description: "Description",
      amount: "Amount",
      category: "Category",
    },
    updatedAt: "local",
  },
];

export function ImportsWorkbench() {
  const [rows, setRows] = useState<ImportPreviewRow[]>(() => demoFallback(sampleImportRows, []));
  const [batches, setBatches] = useState<ImportBatch[]>(() => demoFallback(sampleImportBatches, []));
  const [selectedBatchId, setSelectedBatchId] = useState(() => demoFallback(sampleImportBatches[0]?.id ?? "", ""));
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>(() => demoFallback(sampleAccounts.map((account) => ({ id: account.name, name: account.name })), []));
  const [importMappings, setImportMappings] = useState<ImportMappingSummary[]>(() => demoFallback(fallbackImportMappings, []));
  const [selectedMappingId, setSelectedMappingId] = useState(() => demoFallback(fallbackImportMappings[0]?.id ?? "none", "none"));
  const [mappingForm, setMappingForm] = useState({
    name: "Standard CSV",
    date: "Date",
    description: "Description",
    amount: "Amount",
    debit: "",
    credit: "",
    category: "Category",
  });
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(() => demoFallback(sampleAccounts[0]?.name ?? "", ""));
  const [dataSource, setDataSource] = useState<DataSourceState>(() => fallbackDataSource());
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isImportActionPending, setIsImportActionPending] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("Uncategorized");
  const [bulkStatus, setBulkStatus] = useState<ImportRowStatus>("accepted");

  useEffect(() => {
    let isMounted = true;

    async function loadImports() {
      try {
        const importUrl = selectedBatchId ? `/api/imports?importId=${encodeURIComponent(selectedBatchId)}` : "/api/imports";
        const [accountsResponse, importsResponse] = await Promise.all([
          fetch("/api/accounts", { headers: { Accept: "application/json" } }),
          fetch(importUrl, { headers: { Accept: "application/json" } }),
        ]);
        const mappingsResponse = await fetch("/api/import-mappings", { headers: { Accept: "application/json" } });

        if (!accountsResponse.ok || !importsResponse.ok) {
          throw new Error("Import APIs unavailable");
        }

        const accountsPayload = (await accountsResponse.json()) as { accounts: DatabaseAccount[] };
        const importsPayload = (await importsResponse.json()) as { batches: ImportBatch[]; rows: ImportPreviewRow[]; selectedImportId: string | null };
        const mappingsPayload = mappingsResponse.ok ? ((await mappingsResponse.json()) as { mappings: ImportMappingSummary[] }) : { mappings: [] };
        const nextAccounts = accountsPayload.accounts.map((account) => ({ id: account.id, name: account.name }));

        if (isMounted && !hasLocalEdits.current) {
          setAccountOptions(nextAccounts.length > 0 ? nextAccounts : demoFallback(sampleAccounts.map((account) => ({ id: account.name, name: account.name })), []));
          setSelectedAccountId(nextAccounts[0]?.id ?? selectedAccountId);
          setImportMappings(mappingsPayload.mappings.length > 0 ? mappingsPayload.mappings : demoFallback(fallbackImportMappings, []));
          setSelectedMappingId(mappingsPayload.mappings[0]?.id ?? demoFallback(fallbackImportMappings[0]?.id ?? "none", "none"));
          setBatches(importsPayload.batches);
          setSelectedBatchId(importsPayload.selectedImportId ?? importsPayload.batches[0]?.id ?? "");
          setRows(importsPayload.rows);
          setDataSource("database");
        }
      } catch {
        if (isMounted && !hasLocalEdits.current) {
          setRows(demoFallback(sampleImportRows, []));
          setBatches(demoFallback(sampleImportBatches, []));
          setAccountOptions(demoFallback(sampleAccounts.map((account) => ({ id: account.name, name: account.name })), []));
          setImportMappings(demoFallback(fallbackImportMappings, []));
          setDataSource(fallbackDataSource());
        }
      }
    }

    void loadImports();

    return () => {
      isMounted = false;
    };
  }, [selectedAccountId, selectedBatchId]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { accepted: 0, duplicate: 0, needs_review: 0, rejected: 0 } satisfies Record<ImportRowStatus, number>,
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => [row.description, row.category, row.date, String(row.rowNumber)].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [query, rows]);

  const activeBatch = batches.find((batch) => batch.id === selectedBatchId) ?? batches[0];
  const selectedVisibleRows = filteredRows.filter((row) => selectedRowIds.includes(row.id));
  const selectedVisibleCount = selectedVisibleRows.length;
  const allVisibleRowsSelected = filteredRows.length > 0 && selectedVisibleCount === filteredRows.length;

  async function updateRow(id: string, patch: Partial<ImportPreviewRow>) {
    hasLocalEdits.current = true;
    const previousRows = rows;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setMutationMessage(null);

    if (dataSource === "database") {
      try {
        await fetch("/api/imports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id, category: patch.category, status: patch.status }),
        });
      } catch {
        if (!canUseLocalFallback(dataSource)) {
          setRows(previousRows);
          setError(productionFallbackMessage("Import row update"));
          return;
        }

        setError("Import row update stayed local because the API was unavailable.");
      }
    }
  }

  function toggleRowSelection(id: string) {
    setSelectedRowIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisibleRows() {
    setSelectedRowIds(allVisibleRowsSelected ? [] : filteredRows.map((row) => row.id));
  }

  async function updateSelectedRows(patch: Partial<Pick<ImportPreviewRow, "category" | "status">>, successMessage: string) {
    if (selectedVisibleRows.length === 0) {
      return;
    }

    const selectedIds = selectedVisibleRows.map((row) => row.id);
    hasLocalEdits.current = true;
    const previousRows = rows;
    setRows((current) => current.map((row) => (selectedIds.includes(row.id) ? { ...row, ...patch } : row)));
    setMutationMessage(null);

    if (dataSource === "database") {
      try {
        await Promise.all(
          selectedIds.map((id) =>
            fetch("/api/imports", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ id, category: patch.category, status: patch.status }),
            }).then((response) => {
              if (!response.ok) {
                throw new Error("Import row update failed");
              }
            }),
          ),
        );
      } catch {
        if (!canUseLocalFallback(dataSource)) {
          setRows(previousRows);
          setError(productionFallbackMessage("Bulk import row update"));
          return;
        }

        setDataSource(fallbackDataSource());
        setError(demoFallback("Bulk import row update stayed local because the API was unavailable.", productionFallbackMessage("Bulk import row update")));
        return;
      }
    }

    setSelectedRowIds([]);
    setError(null);
    setMutationMessage(successMessage);
  }

  async function stageMockFile() {
    const nextNumber = Math.max(...rows.map((row) => row.rowNumber)) + 1;
    const nextRow = {
      id: `local_${Date.now()}`,
      rowNumber: nextNumber,
      date: new Date().toISOString().slice(0, 10),
      description: "NEW CSV ROW",
      category: "Uncategorized",
      amountMinor: -4218,
      status: "needs_review" as ImportRowStatus,
    };
    hasLocalEdits.current = true;

    if (dataSource === "database") {
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          filename: `manual-stage-${Date.now()}.csv`,
          savedMappingId: isUuid(selectedMappingId) ? selectedMappingId : undefined,
          rows: [
            {
              rowNumber: nextRow.rowNumber,
              date: nextRow.date,
              description: nextRow.description,
              amount: "-42.18",
              category: nextRow.category,
              status: nextRow.status,
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as { import: DatabaseImport };
        const stagedBatch = payload.import;
        const importsResponse = await fetch("/api/imports", { headers: { Accept: "application/json" } });

        if (importsResponse.ok) {
          const importsPayload = (await importsResponse.json()) as { batches: ImportBatch[]; rows: ImportPreviewRow[]; selectedImportId: string | null };
          setBatches(importsPayload.batches);
          setSelectedBatchId(importsPayload.selectedImportId ?? importsPayload.batches[0]?.id ?? "");
          setRows(importsPayload.rows);
          setError(null);
          return;
        }

        setRows([{ ...nextRow, id: `row_${stagedBatch.id}_${nextRow.rowNumber}` }]);
        setBatches((current) => [
          {
            id: stagedBatch.id,
            filename: stagedBatch.originalFilename,
            account: accountOptions.find((account) => account.id === selectedAccountId)?.name ?? "Selected account",
            status: stagedBatch.status,
            uploadedAt: new Date(stagedBatch.createdAt).toISOString().slice(0, 16).replace("T", " "),
            acceptedRows: stagedBatch.acceptedRowCount,
            rejectedRows: stagedBatch.rejectedRowCount,
          },
          ...current,
        ]);
        setSelectedBatchId(stagedBatch.id);
        setError(null);
        return;
      }
    }

    if (!canUseLocalFallback(dataSource)) {
      setError(productionFallbackMessage("Import staging"));
      return;
    }

    const batch = {
      id: `local_batch_${Date.now()}`,
      filename: "manual-stage.csv",
      account: accountOptions.find((account) => account.id === selectedAccountId)?.name ?? "Selected account",
      status: "staged" as const,
      uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      acceptedRows: 0,
      rejectedRows: 0,
    };
    setRows((current) => [nextRow, ...current]);
    setBatches((current) => [batch, ...current]);
    setSelectedBatchId(batch.id);
    setDataSource(fallbackDataSource());
    setError(dataSource === "database" ? demoFallback("Import stayed local because the API rejected the staged rows.", productionFallbackMessage("Import staging")) : null);
  }

  async function stageCsvFile(file: File | null) {
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file.");
      return;
    }

    if (file.size > 1_000_000) {
      setError("CSV file must be 1 MB or smaller for this intake path.");
      return;
    }

    const parsedRows = parseCsvImportRows(await file.text(), getSelectedMapping(importMappings, selectedMappingId)?.mapping);

    if (parsedRows.length === 0) {
      setError("CSV must include a header row and at least one transaction row.");
      return;
    }

    await stageParsedRows(file.name, parsedRows);
  }

  async function stageParsedRows(filename: string, parsedRows: ParsedCsvImportRow[]) {
    hasLocalEdits.current = true;
    const stageableRows = parsedRows.filter((row) => row.status !== "rejected");
    const rejectedRows = parsedRows.filter((row) => row.status === "rejected");
    const nextRows = parsedRows.map(toPreviewRow);

    if (dataSource === "database" && stageableRows.length > 0) {
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          filename,
          savedMappingId: isUuid(selectedMappingId) ? selectedMappingId : undefined,
          rows: stageableRows.map((row) => ({
            rowNumber: row.rowNumber,
            date: row.date,
            description: row.description,
            amount: row.amount,
            category: row.category,
            status: row.status,
          })),
        }),
      });

      if (response.ok) {
        const importsResponse = await fetch("/api/imports", { headers: { Accept: "application/json" } });

        if (importsResponse.ok) {
          const importsPayload = (await importsResponse.json()) as { batches: ImportBatch[]; rows: ImportPreviewRow[]; selectedImportId: string | null };
          setBatches(importsPayload.batches);
          setSelectedBatchId(importsPayload.selectedImportId ?? importsPayload.batches[0]?.id ?? "");
          setRows(rejectedRows.length > 0 ? [...rejectedRows.map(toPreviewRow), ...importsPayload.rows] : importsPayload.rows);
          setError(rejectedRows.length > 0 ? `${rejectedRows.length} rejected row${rejectedRows.length === 1 ? "" : "s"} stayed local for correction.` : null);
          return;
        }
      }
    }

    if (!canUseLocalFallback(dataSource)) {
      setError(productionFallbackMessage("CSV staging"));
      return;
    }

    const batch = {
      id: `local_batch_${Date.now()}`,
      filename,
      account: accountOptions.find((account) => account.id === selectedAccountId)?.name ?? "Selected account",
      status: "staged" as const,
      uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      acceptedRows: parsedRows.filter((row) => row.status === "accepted").length,
      rejectedRows: rejectedRows.length,
    };
    setRows(nextRows);
    setBatches((current) => [batch, ...current]);
    setSelectedBatchId(batch.id);
    setDataSource(fallbackDataSource());
    setError(
      dataSource === "database"
        ? demoFallback("CSV stayed local because the import API rejected the staged rows.", productionFallbackMessage("CSV staging"))
        : rejectedRows.length > 0
          ? `${rejectedRows.length} row${rejectedRows.length === 1 ? "" : "s"} need correction before commit.`
          : null,
    );
  }

  async function runImportAction(action: "commit" | "rollback") {
    if (!activeBatch) {
      return;
    }

    hasLocalEdits.current = true;
    setIsImportActionPending(true);

    if (dataSource === "database") {
      try {
        const response = await fetch(`/api/imports/${activeBatch.id}/${action}`, {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Import ${action} failed`);
        }

        setBatches((current) => current.map((batch) => (batch.id === activeBatch.id ? { ...batch, status: action === "commit" ? "committed" : "rolled_back" } : batch)));
        setError(null);
        setIsImportActionPending(false);
        return;
      } catch {
        if (!canUseLocalFallback(dataSource)) {
          setError(productionFallbackMessage(`Import ${action}`));
          setIsImportActionPending(false);
          return;
        }
        setDataSource(fallbackDataSource());
        setError(`Import ${action} stayed local because the API was unavailable.`);
        setIsImportActionPending(false);
        return;
      }
    }

    setBatches((current) => current.map((batch) => (batch.id === activeBatch.id ? { ...batch, status: action === "commit" ? "committed" : "rolled_back" } : batch)));
    setDataSource(fallbackDataSource());
    setIsImportActionPending(false);
  }

  async function selectBatch(batchId: string) {
    setSelectedBatchId(batchId);

    if (dataSource !== "database" || !isUuid(batchId)) {
      return;
    }

    try {
      const response = await fetch(`/api/imports?importId=${encodeURIComponent(batchId)}`, { headers: { Accept: "application/json" } });

      if (!response.ok) {
        throw new Error("Import detail API unavailable");
      }

      const payload = (await response.json()) as { batches: ImportBatch[]; rows: ImportPreviewRow[]; selectedImportId: string | null };
      setBatches(payload.batches);
      setSelectedBatchId(payload.selectedImportId ?? batchId);
      setRows(payload.rows);
      setError(null);
    } catch {
      setError("Import detail stayed on the current preview because the API was unavailable.");
    }
  }

  async function saveMappingProfile() {
    const mapping = buildMappingFromForm(mappingForm);
    const hasCoreColumns = mapping.date && mapping.description;
    const hasAmountColumns = mapping.amount || mapping.debit || mapping.credit;

    if (!hasCoreColumns || !hasAmountColumns) {
      setError("Mapping needs date, description, and either amount or debit/credit columns.");
      return;
    }

    const localMapping = {
      id: `local_mapping_${Date.now()}`,
      accountId: selectedAccountId,
      name: mappingForm.name.trim() || "CSV mapping",
      mapping,
      updatedAt: new Date().toISOString(),
    };

    hasLocalEdits.current = true;

    if (dataSource === "database") {
      try {
        const response = await fetch("/api/import-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            name: localMapping.name,
            mapping,
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as { mapping: ImportMappingSummary };
          setImportMappings((current) => [payload.mapping, ...current]);
          setSelectedMappingId(payload.mapping.id);
          setError(null);
          return;
        }
      } catch {
        if (!canUseLocalFallback(dataSource)) {
          setError(productionFallbackMessage("Import mapping save"));
          return;
        }
      }
    }

    if (!canUseLocalFallback(dataSource)) {
      setError(productionFallbackMessage("Import mapping save"));
      return;
    }

    setImportMappings((current) => [localMapping, ...current]);
    setSelectedMappingId(localMapping.id);
    setDataSource(fallbackDataSource());
    setError(dataSource === "database" ? demoFallback("Mapping stayed local because the API was unavailable.", productionFallbackMessage("Import mapping save")) : null);
  }

  const selectedAccountName = accountOptions.find((account) => account.id === selectedAccountId)?.name ?? selectedAccountId;

  return (
    <div className="transactions-grid">
      <section className="transactions-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-4">
          <ImportMetric label="Accepted" value={`${summary.accepted}`} icon={<CheckCircle2 size={17} />} tone="green" />
          <ImportMetric label="Review" value={`${summary.needs_review}`} icon={<ListChecks size={17} />} tone="violet" />
          <ImportMetric label="Duplicates" value={`${summary.duplicate}`} icon={<FileSpreadsheet size={17} />} tone="gold" />
          <ImportMetric label="Rejected" value={`${summary.rejected}`} icon={<ShieldAlert size={17} />} tone="coral" />
        </div>

        <section className="panel transactions-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Staging</p>
              <h2 className="panel-title">Import review</h2>
            </div>
            <span className={dataSourceStatusClass(dataSource)}>{dataSourceLabel(dataSource)}</span>
            <div className="transaction-controls">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search import rows" placeholder="Search rows" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <select aria-label="Import account" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
                {accountOptions.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select aria-label="Import mapping" value={selectedMappingId} onChange={(event) => setSelectedMappingId(event.target.value)}>
                {importMappings.map((mapping) => (
                  <option value={mapping.id} key={mapping.id}>
                    {mapping.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {mutationMessage ? <p className="form-success">{mutationMessage}</p> : null}

          <div className="transaction-undo-banner review-bulk-bar">
            <span>{selectedVisibleCount} selected</span>
            <select aria-label="Bulk import category" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}>
              {categories.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateSelectedRows({ category: bulkCategory }, `${selectedVisibleCount} selected import rows recategorized.`)}
              disabled={selectedVisibleCount === 0}
            >
              Set category
            </button>
            <select aria-label="Bulk import status" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as ImportRowStatus)}>
              {statuses.map((status) => (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateSelectedRows({ status: bulkStatus }, `${selectedVisibleCount} selected import rows marked ${bulkStatus.replace("_", " ")}.`)}
              disabled={selectedVisibleCount === 0}
            >
              Set status
            </button>
          </div>

          <div className="transactions-table import-preview-table" role="table" aria-label="Import rows">
            <div className="transactions-table-head" role="row">
              <span>
                <input aria-label="Select all import rows" checked={allVisibleRowsSelected} onChange={toggleAllVisibleRows} type="checkbox" />
              </span>
              <span>Description</span>
              <span>Category</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {filteredRows.map((row) => (
              <div className="transactions-table-row" role="row" key={row.id}>
                <input
                  aria-label={`Select row ${row.rowNumber}`}
                  checked={selectedRowIds.includes(row.id)}
                  onChange={() => toggleRowSelection(row.id)}
                  type="checkbox"
                />
                <div className="transaction-register-name">
                  <p>{row.description || "Missing description"}</p>
                  <span>
                    #{row.rowNumber} • {row.date}
                  </span>
                </div>
                <select aria-label={`Category for row ${row.rowNumber}`} value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value })}>
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select aria-label={`Status for row ${row.rowNumber}`} value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value as ImportRowStatus })}>
                  {statuses.map((status) => (
                    <option value={status.value} key={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <strong className={row.amountMinor < 0 ? "amount-negative" : "amount-positive"}>{formatMoney(row.amountMinor)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">CSV intake</p>
              <h2 className="panel-title">Stage file</h2>
            </div>
            <div className="summary-icon">
              <Upload size={17} />
            </div>
          </div>
          <div className="mt-6 grid gap-3 rounded-[8px] border border-dashed border-[rgba(214,226,217,0.22)] p-5 text-[var(--muted)]">
            <FileSpreadsheet size={26} />
            <p className="m-0 font-bold text-[var(--ink-strong)]">CSV staging area</p>
            <span className="font-mono text-[11px]">{selectedAccountName}</span>
            <span className="font-mono text-[11px]">Mapping: {getSelectedMapping(importMappings, selectedMappingId)?.name ?? "Auto-detect"}</span>
            {selectedFileName ? <span className="font-mono text-[11px]">{selectedFileName}</span> : null}
            {error ? <p className="form-error">{error}</p> : null}
            <label className="file-action">
              <Upload size={16} />
              Stage CSV file
              <input aria-label="Stage CSV file" type="file" accept=".csv,text/csv" onChange={(event) => void stageCsvFile(event.target.files?.[0] ?? null)} />
            </label>
            <button className="primary-action" type="button" onClick={stageMockFile}>
              <Upload size={16} />
              Add sample row
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => runImportAction("commit")}
              disabled={!activeBatch || activeBatch.status === "committed" || activeBatch.status === "rolled_back" || isImportActionPending}
            >
              <CheckCircle2 size={16} />
              Commit import
            </button>
            <button className="secondary-action" type="button" onClick={() => runImportAction("rollback")} disabled={!activeBatch || activeBatch.status !== "committed" || isImportActionPending}>
              <RotateCcw size={16} />
              Roll back import
            </button>
          </div>
        </section>

        <section className="panel account-form-panel">
          <p className="panel-label">Mapping profile</p>
          <div className="account-form mt-5">
            <label>
              <span>Name</span>
              <input value={mappingForm.name} onChange={(event) => setMappingForm((current) => ({ ...current, name: event.target.value }))} placeholder="Bank CSV" />
            </label>
            <label>
              <span>Date column</span>
              <input value={mappingForm.date} onChange={(event) => setMappingForm((current) => ({ ...current, date: event.target.value }))} placeholder="Date" />
            </label>
            <label>
              <span>Description column</span>
              <input value={mappingForm.description} onChange={(event) => setMappingForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
            </label>
            <label>
              <span>Amount column</span>
              <input value={mappingForm.amount} onChange={(event) => setMappingForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" />
            </label>
            <label>
              <span>Debit column</span>
              <input value={mappingForm.debit} onChange={(event) => setMappingForm((current) => ({ ...current, debit: event.target.value }))} placeholder="Debit" />
            </label>
            <label>
              <span>Credit column</span>
              <input value={mappingForm.credit} onChange={(event) => setMappingForm((current) => ({ ...current, credit: event.target.value }))} placeholder="Credit" />
            </label>
            <label>
              <span>Category column</span>
              <input value={mappingForm.category} onChange={(event) => setMappingForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" />
            </label>
            <button className="secondary-action" type="button" onClick={saveMappingProfile}>
              <CheckCircle2 size={16} />
              Save mapping
            </button>
          </div>
        </section>

        <section className="panel account-form-panel">
          <p className="panel-label">Recent files</p>
          <div className="mt-5 grid gap-3">
            {batches.map((batch) => (
              <button className="import-history-item" data-state={batch.id === activeBatch?.id ? "selected" : "idle"} type="button" key={batch.id} onClick={() => void selectBatch(batch.id)}>
                <span className={batch.status === "committed" ? "status-chip status-chip-live" : "status-chip"}>{batch.status.replace("_", " ")}</span>
                <strong>{batch.filename}</strong>
                <span>
                  {batch.account} • {batch.uploadedAt}
                </span>
                <small>
                  {batch.acceptedRows} accepted / {batch.rejectedRows} rejected
                </small>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

type DatabaseAccount = {
  id: string;
  name: string;
};

type DatabaseImport = {
  acceptedRowCount: number;
  createdAt: string;
  id: string;
  originalFilename: string;
  rejectedRowCount: number;
  status: ImportBatch["status"];
};

type ImportMappingSummary = {
  accountId: string | null;
  id: string;
  mapping: CsvImportColumnMapping;
  name: string;
  updatedAt: string;
};

type AccountOption = {
  id: string;
  name: string;
};

function buildMappingFromForm(mappingForm: {
  amount: string;
  category: string;
  credit: string;
  date: string;
  debit: string;
  description: string;
}) {
  return {
    date: mappingForm.date.trim(),
    description: mappingForm.description.trim(),
    amount: mappingForm.amount.trim() || undefined,
    debit: mappingForm.debit.trim() || undefined,
    credit: mappingForm.credit.trim() || undefined,
    category: mappingForm.category.trim() || undefined,
  };
}

function getSelectedMapping(mappings: ImportMappingSummary[], selectedMappingId: string) {
  return mappings.find((mapping) => mapping.id === selectedMappingId) ?? mappings[0];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toPreviewRow(row: ParsedCsvImportRow): ImportPreviewRow {
  return {
    id: `local_row_${row.rowNumber}_${row.status}`,
    rowNumber: row.rowNumber,
    date: row.date,
    description: row.description || row.validationMessage || "Rejected CSV row",
    category: row.category,
    amountMinor: row.amountMinor,
    status: row.status,
  };
}

function ImportMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "coral" | "violet" | "gold" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}

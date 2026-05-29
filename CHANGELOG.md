# Changelog

## Unreleased

### Added

- Selectable CSV import history with per-batch preview, commit, and rollback actions.
- Transaction edit controls for date, merchant, amount, and notes.
- Bulk review actions for selected unresolved transactions.
- Transaction register sorting and bulk category/status/movement updates.
- Account report drilldowns from net worth and account detail metrics.
- Import preview bulk row correction before commit.
- Net worth balance evidence labels for transaction-derived, manual snapshot, imported snapshot, and missing evidence values.
- Tracked-file secret scan via `npm run secrets:scan`.
- Production domain DNS setup for `praxisledger.app` and Clerk DNS records.
- Gringotts-style sidebar foundation with resize, collapse, drag-reorder navigation, profile avatar/name display, theme toggle, and placeholder routes for Payroll, Credit Cards, Files, and Upload.
- `ledger_settings` persistence table for profile, sidebar, and per-ledger UI preferences.
- User-facing Settings workbench with Profile, Appearance, Sidebar, Ledger, Data & exports, and Audit trail subareas.
- Gringotts-compatible transaction and review APIs for review queue context, merchant history, bulk edits, per-row edits, categorization, unreview, and rule recleaning.
- Focused Review workbench with single-transaction triage, merchant cleanup, suggested category application, transfer toggling, similar-transaction context, and undo.
- Gringotts-style Transactions register with date-grouped rows, active-row editing, bulk controls, account/tag context, and Fidelity-token styling.
- Document evidence storage with Files and Upload workbenches, PDF duplicate preview, document metadata editing, soft delete, and source-evidence audit events.
- Credit Cards and Payroll workbenches backed by current account, transaction, and document data with Fidelity-token register layouts.
- Dashboard redesigned into a cleaner ledger overview with summary metrics, cashflow, recent activity, position breakdown, spending mix, and status coverage.
- Hardening review notes documenting current security fixes and remaining release-readiness risks.
- Route-level tests for protected API auth and export method behavior.

### Changed

- Design direction now uses Gringotts Vault workbench layouts with Fidelity-derived dark institutional colors, while excluding the dashboard from the Gringotts port.
- Shared app tokens now use the Fidelity-derived palette, stronger borders, larger radii, and wider Gringotts-style sidebar.
- Settings no longer leads with internal production-readiness diagnostics.
- Transaction toolbar layout now wraps filter/sort controls instead of compressing labels.
- Deployment verification docs now include the secret scan gate.
- Production workbenches now show empty/error states instead of synthetic demo financial data after API failures.
- Export controls now generate files through `POST /api/exports` instead of mutating state through download links.

### Security

- Block cross-site API writes and export-generation requests at the proxy layer.
- Validate document upload count, size, extension, and MIME type before hashing file bytes.
- Validate profile customization payload size and shape before persisting ledger settings.
- Return controlled `400` responses for malformed JSON bodies across mutation APIs.
- Return controlled `400` responses for malformed document upload multipart bodies.
- Attach configured security headers from the runtime proxy.
- Prevent `GET /api/exports` from creating export jobs or audit events.

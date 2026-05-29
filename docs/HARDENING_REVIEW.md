# Hardening Review

## Current Priority

This project is now past the first V1 feature migration pass. New work should favor correctness, security, and release-readiness over additional feature breadth until the user finishes reviewing the current UI and workflows.

## Fixed in Current Pass

- Production workbenches no longer fall back to synthetic financial data after API failures.
- Cross-site API writes are blocked at the proxy layer using fetch metadata and origin checks.
- `/api/exports` is treated as state-changing because it creates `export_jobs` and `audit_events`.
- Document upload and preview requests enforce file count, size, extension, and MIME allowlists before hashing file bytes.
- Profile customization writes validate payload shape and size before persisting settings.
- JSON mutation routes now share controlled body parsing so malformed payloads return `400` responses before schema validation.
- Document upload and preview routes now return controlled `400` responses for malformed multipart bodies.
- Runtime proxy responses now attach the configured CSP, HSTS, content type, frame, referrer, and permissions policy headers.
- Export generation now uses `POST`; `GET /api/exports` is non-mutating and returns `405`.
- Representative route-level tests now cover protected API `401` responses and export method guards.
- Production mutation failures no longer create local-only accounts, snapshots, transactions, categories, merchant rules, import rows, import batches, or import mappings.
- Production review workflow failures no longer advance or mutate the local review queue after failed merchant, status, transfer, or undo writes.
- Production transaction register failures now roll back optimistic status, category, transfer, tag, delete, restore, and edit changes.
- Production file metadata, import commit/rollback, and ledger settings failures no longer report local-only success after failed server writes.
- Production document uploads fail closed unless metadata-only uploads are explicitly enabled with `DOCUMENT_STORAGE_MODE=metadata-only`.
- Production setup readiness now requires database-backed rate limiting, and production API rate limits use Postgres instead of process memory.
- Neon migration journal drift has been repaired for the configured database, and the `rate_limits` migration has been applied.
- Mutation queries now keep ledger ownership predicates on follow-up updates after scoped reads.
- Public health checks now return only minimal readiness counts; detailed setup state remains behind authenticated API protection.
- Failed export jobs persist a generic user-facing error instead of raw server exception messages.
- Production server error logs redact raw exception messages while retaining structured event context.
- Read-side account and category joins now include ledger ownership predicates before exposing related labels in transactions, imports, documents, rules, review, and exports.
- API schemas now reject malformed account/category foreign keys as UUID validation errors before they can reach Postgres query predicates.

## Remaining Review Items

- Add production object storage for uploaded documents; metadata-only uploads are guarded behind an explicit beta flag.
- Continue auditing lower-risk optimistic local mutation fallbacks outside the core financial register. Development demo mode is useful, but production should avoid local-only writes.

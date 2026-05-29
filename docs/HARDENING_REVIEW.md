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

## Remaining Review Items

- Replace in-memory rate limiting before broad beta usage. Serverless instances do not share the current process-local counter.
- Resolve migration journal drift in the current Neon database before relying on `drizzle-kit migrate` operationally.
- Add route-level tests for representative API authorization paths beyond the pure helper tests.
- Add production object storage for uploaded documents; current document rows store metadata and pending storage keys only.
- Decide whether export generation should move from `GET` to `POST` plus signed artifact retrieval for stricter HTTP semantics.
- Continue reducing optimistic local mutation fallbacks. Development demo mode is useful, but production should avoid local-only writes.

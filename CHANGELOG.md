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

### Changed

- Transaction toolbar layout now wraps filter/sort controls instead of compressing labels.
- Deployment verification docs now include the secret scan gate.

### Blocked

- GitHub push is blocked by local 1Password SSH signing: `sign_and_send_pubkey ... communication with agent failed`.
- Production deploy remains blocked until live Clerk production env vars are added to Vercel and Clerk SSL is active.

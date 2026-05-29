# Monarch Money Feature Parity Map

## Status

Draft north-star scope.

This document defines Monarch Money feature parity as the long-term product target for Praxis Ledger. It does not mean every feature belongs in V1. V1 should remain the trustworthy ledger foundation, while the roadmap expands toward parity in deliberate layers.

## Product Goal

Praxis Ledger should become a credible Monarch Money replacement for a power personal-finance user.

Parity means matching the core jobs-to-be-done, not cloning Monarch's UI or implementation choices.

The product should eventually support:

- Daily account visibility.
- Transaction review and categorization.
- Budgeting and spending plans.
- Cashflow reporting.
- Net worth tracking.
- Investments and holdings visibility.
- Recurring bills/subscriptions.
- Goals and long-term planning.
- Rules and automation.
- Household collaboration.
- Import/export and data ownership.
- Mobile-friendly review and browsing.

## Parity Principles

1. **Feature parity follows trust.** Do not add breadth before transaction, account, import, and category data are durable.
2. **Parity does not require identical UX.** Praxis can organize workflows differently if the user outcome is equal or better.
3. **Manual workflows must be excellent before sync.** CSV/manual account flows should remain first-class even after bank sync.
4. **Every automated action needs explanation.** Rules, categorization, and sync changes must show provenance.
5. **Power-user depth is the differentiator.** Where Monarch optimizes for general consumers, Praxis should expose auditability, exportability, and source traceability.

## Capability Map

### 1. Accounts and Net Worth

Parity capabilities:

- Connected accounts.
- Manual accounts.
- Account groups.
- Account hiding/exclusion.
- Balance history.
- Net worth trend.
- Assets and liabilities.
- Institution health/status.

Praxis direction:

- V1 starts with manual accounts and imported/manual balances.
- Add balance snapshots, account freshness, and account inclusion rules before bank sync.
- Bank sync becomes a later integration layer, not the foundation of truth.

### 2. Transactions

Parity capabilities:

- Transaction table/list.
- Search and filters.
- Merchant cleanup.
- Category assignment.
- Split transactions.
- Transfer identification.
- Attachments/notes.
- Review workflow.
- Bulk edits.
- CSV import/export.

Praxis direction:

- This is the primary V1 surface.
- Preserve the Gringotts-inspired transaction workbench: sticky filters, saved views, date groups, compact rows, bulk selection, and expandable inline detail.
- Add split transactions, transfer matching, attachments, and saved views as near-term parity items.

### 3. Categories and Rules

Parity capabilities:

- Default category taxonomy.
- Custom categories.
- Category groups.
- Merchant/category rules.
- Rule ordering/conditions.
- Bulk recategorization.

Praxis direction:

- V1 supports two-level categories and merchant rules.
- Next parity step is a rule workbench with conditions, previews, apply-to-history, and rollback.
- Every rule application should record provenance.

### 4. Budgeting and Spending Plan

Parity capabilities:

- Monthly budget/spending plan.
- Category-level budgets.
- Rollover/flexible budget behavior.
- Income planning.
- Remaining-to-spend views.
- Actual vs planned comparisons.

Praxis direction:

- Budgeting should not be shame/guilt-driven.
- Frame this as "Plan" or "Spending Plan," not a beginner budget coach.
- Build after transaction/category foundations are reliable.
- Support both category plans and higher-level cashflow plans.

### 5. Recurring Bills and Subscriptions

Parity capabilities:

- Recurring transaction detection.
- Upcoming bills/subscriptions.
- Calendar/list view.
- Forecast impact on cashflow.
- Mark expected/paid.

Praxis direction:

- Add recurring merchant detection after the transaction ledger is mature.
- Recurring items should connect to forecast and cashflow, not just alerts.
- Manual recurring rules should be editable and explainable.

### 6. Goals

Parity capabilities:

- Savings goals.
- Debt payoff goals.
- Target dates/amounts.
- Linked accounts.
- Progress tracking.

Praxis direction:

- Defer until core reporting is strong.
- Goals should tie directly to accounts and cashflow assumptions.
- Avoid gamified progress language.

### 7. Investments

Parity capabilities:

- Holdings view.
- Account allocation.
- Investment balance trend.
- Asset allocation.
- Performance overview.

Praxis direction:

- Start with investment account balances in net worth.
- Later add holdings, allocation, performance, and cost basis if data source supports it.
- Do not let investments turn the app into a trading terminal.

### 8. Reporting

Parity capabilities:

- Dashboard.
- Cashflow.
- Spending by category.
- Net worth.
- Income/expense trends.
- Custom report filters.
- Drilldowns.

Praxis direction:

- Reporting is a core differentiator.
- Every report should drill into source transactions or account snapshots.
- Reports should support saved views and exportable snapshots.

### 9. Collaboration and Household

Parity capabilities:

- Shared household/workspace.
- Partner access.
- Multiple members.
- Permissions.

Praxis direction:

- User asked to defer households for now, so V1 remains single-user.
- The architecture should still avoid blocking future household support.
- Collaboration becomes a parity milestone after single-user workflows are excellent.

### 10. Imports, Sync, and Data Portability

Parity capabilities:

- Bank sync.
- Manual imports.
- CSV export.
- Backup/data export.
- Institution connection repair.

Praxis direction:

- V1 emphasizes CSV/manual import, provenance, rollback, and backup package export.
- Bank sync is a parity milestone after import/review/category workflows are durable.
- Data portability should be better than Monarch, not merely equal.

### 11. Mobile

Parity capabilities:

- Mobile app or mobile-friendly experience.
- Quick transaction review.
- Dashboard/account browsing.
- Notifications.

Praxis direction:

- V1 can be responsive web.
- Mobile should prioritize review, transactions, accounts, and alerts.
- Native mobile is post-foundation.

## Phased Parity Roadmap

### Foundation: Private Beta Ledger

Goal: Make the core ledger trustworthy.

- Auth.
- Single-user ledger.
- Accounts.
- Categories.
- Transactions.
- CSV import.
- Review queue.
- Rules v1.
- Cashflow.
- Net worth.
- Export/backup.
- Audit trail.

### Parity Phase 1: Strong Daily Use

Goal: Become useful enough for regular personal-finance review.

- Saved transaction views.
- Split transactions.
- Transfer matching.
- Advanced rules.
- Recurring transaction detection.
- Spending plan v1.
- Account freshness.
- Better dashboard and report drilldowns.

### Parity Phase 2: Planning and Automation

Goal: Match Monarch's planning workflows.

- Category budgets/spending plan.
- Rollover behavior.
- Goals.
- Upcoming bills/subscriptions.
- Cashflow forecast.
- Notification preferences.
- Report exports.

### Parity Phase 3: Integrations and Breadth

Goal: Match mainstream finance-app coverage.

- Bank sync.
- Investment holdings.
- Institution connection status.
- Attachments/documents.
- Mobile-first review experience.
- Household collaboration.

### Differentiation Phase

Goal: Go beyond Monarch for power users.

- Statement-backed reconciliation.
- Source confidence scoring.
- Backup/restore.
- Rule provenance and rollback.
- Forensic/accounting-grade audit views.
- Advanced custom reports.
- Local/self-hostable deployment path if desired.

## Open Product Decisions

- Whether budgeting is called Budget, Plan, Spending Plan, or Cashflow Plan.
- Whether bank sync is required before private beta or can wait.
- Whether household collaboration stays post-V1 or moves earlier for parity.
- How much investment depth is needed to feel like parity.
- Whether mobile parity means responsive web first or native app.
- Whether goal tracking should exist before recurring/forecasting.

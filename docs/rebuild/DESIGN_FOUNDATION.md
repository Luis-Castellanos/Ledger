# Praxis Ledger Design Foundation

## Status

Draft design foundation for the next product-design pass.

This document is intentionally more specific than the general UX principles. Its job is to guide visual design decisions before more V1 functionality is added.

## Product Feel

Praxis Ledger should feel like a modern, refined banking app: calm, precise, durable, and built for repeated use.

Reference qualities:

- Robinhood-like clarity, speed, and modern product polish.
- Robinhood Legend-like modular desktop workspace: customizable-feeling panels, fast scanning, compact widgets, and crisp interaction surfaces.
- Efficient use of space without massive whitespace.
- Sleek modern finance feel rather than institutional bank conservatism.

It should not feel like:

- A crypto or trading terminal.
- A gamified budgeting coach.
- A marketing analytics dashboard.
- A decorative Dribbble concept.
- Traditional accounting software.

The product should borrow accounting discipline around source traceability, controls, review, and auditability, while keeping the core mental model centered on personal-finance transactions.

## Design Principles

1. **Financial truth first.** Layout, typography, and interaction should make numbers easier to trust and inspect.
2. **Tables are primary surfaces.** Transactions, imports, rules, and accounts should feel excellent in table/list form before they get charts or cards.
3. **Density without noise.** Use compact spacing and strong alignment, but avoid visual clutter and excessive borders.
4. **Every metric has evidence.** Important totals should expose their source rows or freshness state.
5. **Charts explain, tables prove.** Charts summarize patterns; exact values belong in rows, tooltips, or drilldowns.
6. **Calm defaults, strong states.** Most UI should be quiet. Review, warning, stale data, destructive actions, and completed states carry the emphasis.
7. **Professional, not sterile.** The app can have personality through typography, spacing, and color, but not through decoration.

## Recommended Direction

Use a **sleek modern finance workspace** as the base direction, closer to Robinhood and Robinhood Legend than Fidelity.

Current preference:

- Mostly light interface.
- Dense but readable work surfaces.
- Excellent table hierarchy.
- Compact dashboard summaries.
- Restrained green brand accent.
- Cool neutral surfaces over warm paper-like surfaces.
- Dark charcoal navigation/chrome is acceptable when it gives the app a sharper modern finance feel.
- Dark mode can exist later, but should not drive the default design.

Rationale:

- The current dark design looks visually interesting, but it creates too much atmosphere around routine financial work.
- The light institutional/Fidelity direction is too basic and conservative for the desired product character.
- A Robinhood/Legend-inspired direction better matches the desired sleekness, speed, and modernity.
- A lighter, denser workspace will make tables, forms, imports, and long review sessions easier.
- The design should feel polished and premium without sacrificing information density.
- The old Gringotts transaction layout had the right ledger-workbench instincts and should be preserved as the transaction-page interaction model.

## Selected Design Reference

Working direction:

- **Global app:** sleek modern finance workspace, closer to Robinhood and Robinhood Legend than Fidelity.
- **Transactions:** Gringotts Vault-inspired ledger workbench.

This means the product should use modern finance-app cues: sharp modular panels, crisp white/light-gray surfaces, compact widgets, high-quality charts, controlled green accents, strong table hierarchy, subtle dark chrome, and precise labels.

It should not become a Robinhood clone or a trading app. The goal is the same level of polish, speed, and modern product feel, adapted to a personal finance ledger.

### Reference Concept

The current expansion board is:

`/Users/luis/.codex/generated_images/019e6a27-2460-7ef1-a727-588fb65859e7/ig_052ee9a1af1d3a53016a19178c06e4819a89fe74ac27c1933f.png`

## Layout System

### App Shell

The app should occupy the full viewport. No decorative outer frame, browser-within-browser feeling, side gutters, or mockup padding.

Desktop default:

- Persistent left navigation.
- Top utility bar inside the main content area.
- Main content uses a full-width work surface.
- Page content can have max readable widths only where the task calls for it, such as settings forms.
- Left navigation may use a deep navy/charcoal institutional treatment if the content area remains light.

Tablet:

- Sidebar can collapse to icons.
- Primary work surface remains table-first.

Mobile:

- Navigation becomes bottom tabs or a compact drawer.
- Avoid trying to show dense dashboard charts as the first mobile surface.
- Mobile defaults to transaction/review tasks and summary cards.

### Container Rules

- Do not put the whole app in a card.
- Do not put page sections in decorative cards by default.
- Use cards for repeated entities, modal content, compact summaries, and isolated actions.
- Prefer full-width bands, table frames, split panes, and workbench sections for core workflows.
- Border radius should be restrained: `6px` default, `8px` maximum for ordinary UI.

## Typography

Typography should prioritize scanning and numeric precision.

Recommended stack:

- UI sans: Inter, system UI, or Geist Sans.
- Numeric/table mono: Geist Mono, SF Mono, or equivalent tabular mono.

Rules:

- Use tabular numerals for money, dates, and account balances.
- Page titles should be clear but not oversized.
- Labels should be compact, uppercase only when it improves scan rhythm.
- Avoid low-contrast microtext for important financial context.
- Keep table typography tighter than dashboard typography.

Starting scale:

- Page title: `28-32px`, semibold.
- Section title: `18-22px`, medium.
- Table body: `13-14px`.
- Table metadata: `12px`.
- Metric value: `24-36px` depending on importance.
- Navigation: `14px`.

## Color Direction

The product should not be one-note dark green or black.

Base palette direction:

- Background: white, cool off-white, or very light neutral.
- Primary surface: white or near-white.
- Secondary surface: soft stone/gray.
- Text: near-black with clear hierarchy.
- Borders: cool neutral gray.
- Accent: restrained green/teal for positive states and brand anchor.
- Supporting accents: blue, amber, red, violet, and slate for semantic use.

Semantic color rules:

- Inflow/success: green.
- Outflow/negative: red/coral, used carefully.
- Transfer/neutral movement: blue or slate.
- Review needed: amber.
- Excluded/archived: muted gray.
- System/security healthy: green.
- Dangerous/destructive: red only.

Charts:

- Use categorical colors consistently across the product.
- Never rely on color alone; labels, legends, and exact values must remain available.
- Avoid saturated rainbow charts.

## Core Components

### Navigation

Primary nav should be quiet and predictable.

Required items for V1:

- Dashboard
- Transactions
- Review
- Imports
- Rules
- Cashflow
- Net Worth
- Accounts
- Settings

Rules:

- Active state should be clear but not loud.
- Icons should support scanning, not dominate.
- Future modules should not appear until usable.

### Dashboard

Purpose: "What changed, and what needs attention?"

Dashboard should become a command surface, not a poster.

Recommended sections:

- Top summary strip: net worth, net cashflow, review queue, import health.
- Primary attention area: review queue and recent import status.
- Recent transactions table/list.
- Cashflow summary with drilldown.
- Account balances/freshness.

Avoid:

- Huge decorative charts.
- Large empty metric cards.
- Placeholder-looking chart panels.
- Repeating the same data in multiple visual treatments.

### Transactions

The transaction table is the most important V1 screen.

Use the old Gringotts Vault transaction page as the interaction reference, restyled into the light institutional design system.

Preserve these Gringotts-derived concepts:

- Sticky transaction toolbar.
- Search, filters, sort, saved views, and row count near the table.
- Date-grouped transaction rows.
- Compact row density.
- Merchant/account/category/amount columns.
- Bulk select.
- Needs-review row treatment.
- Expandable inline row detail.
- Original statement/source text in the expanded detail.
- Inline merchant, category, subcategory, date, notes, split, and delete actions.
- Merchant-focused action: "view all from this merchant."

Required table columns:

- Date.
- Merchant/description.
- Account.
- Category.
- Amount.
- Review status.
- Transfer state.
- Source/import metadata.

Interaction:

- Search and filters remain visible.
- Bulk actions are clear and reversible where possible.
- Inline edit should be fast.
- Row expansion shows source data, notes, tags, and audit details.

### Imports

Imports should feel like a controlled data-ingestion workflow.

Flow:

1. Upload.
2. Parse.
3. Map columns.
4. Preview.
5. Resolve warnings.
6. Commit.
7. Review.

Design emphasis:

- Show row counts and parser confidence.
- Separate staged data from committed data.
- Make rollback visible.
- Failed rows need specific repair guidance.

Visual model:

- Institutional workflow table.
- Status tabs across the top.
- Import account/source selector.
- Row counts and match confidence visible but not decorative.
- Recent import activity and import summary can sit below the table.

### Review

Review should feel like an efficient work queue.

Design emphasis:

- Clear current item or selected batch.
- Suggested category with explanation.
- Similar transaction history.
- Apply-once vs create-rule distinction.
- Undo path.

Visual model:

- Queue table/list on the left or center.
- Selected transaction detail panel on the right.
- Category suggestion and action buttons should be explicit.
- "Mark reviewed" is primary; "skip" and "create rule" are secondary.

### Accounts

Accounts should be operational and precise.

Design emphasis:

- Account list with balance, freshness, type, visibility, and status.
- Account detail page/workbench with snapshots, imports, and transactions.
- Data-source confidence should be visible.

Visual model:

- Group accounts by asset/liability class.
- Use a table/list over cards.
- Show institution, balance, change, freshness, and visibility.
- Account detail can use a right-side inspector or drilldown view.

### Settings

Settings should be user-facing only.

Visible:

- Profile information.
- Ledger preferences.
- Notification preferences.
- Security/account controls.
- Export/backup controls.
- Integrations when user-actionable.
- Destructive data controls, clearly separated.

Not visible:

- Clerk keys.
- Neon connection status.
- Vercel environment.
- Runtime environment.
- Setup readiness gates.
- Deployment diagnostics.
- Internal security-header checks.

## Visual Anti-Patterns

Avoid these unless explicitly chosen for a specific screen:

- Decorative outer app frame.
- One-note dark palette.
- Oversized dashboard hero.
- Floating card stacks for every section.
- Charts without exact-value access.
- Icons as decoration rather than navigation/action support.
- Dense gray-on-black text.
- Marketing copy inside the authenticated app.
- Empty dashboards that still look "designed" but provide no workflow.

## Canonical Reference Screens

Design and implement these first. They will set the visual system for the rest of the app.

1. **Dashboard**
   - Establish app shell, top bar, metric treatment, dashboard density, chart style, and empty states.

2. **Transactions**
   - Establish table system, filters, bulk actions, inline edit, row expansion, and review status styling.

3. **Imports**
   - Establish workflow layout, staged data treatment, warnings, commit/rollback controls, and empty states.

4. **Settings**
   - Establish forms, destructive sections, security/status surfaces, and configuration layouts.

## Design Pass Roadmap

### Pass 1: Direction Selection

- Choose light workstation, dark cockpit, editorial ledger, or a deliberate hybrid.
- Decide whether Praxis Ledger ships with light mode first, dark mode first, or both.
- Decide whether the product name is visible as Praxis Ledger, Ledger, or another final name.

### Pass 2: Design Tokens

- Define color tokens.
- Define typography tokens.
- Define spacing and radius.
- Define table density.
- Define chart color system.
- Define form and control styling.

### Pass 3: Dashboard and Transactions Redesign

- Redesign dashboard as the system reference.
- Redesign transactions as the workflow reference.
- Verify desktop and mobile layouts.

### Pass 4: Workflow Screens

- Redesign imports.
- Redesign review.
- Redesign accounts.
- Redesign settings.

### Pass 5: Production Polish

- Empty/loading/error states.
- Keyboard states.
- Focus states.
- Responsive behavior.
- Accessibility contrast.
- Visual regression screenshots.

## Open Decisions

- Final product name and visible brand text.
- Default theme: light, dark, or system.
- Sidebar vs top navigation for desktop.
- Dashboard first principles: overview-first vs action-queue-first.
- Table density: compact by default vs comfortable by default.
- How close the product should feel to consumer banking vs brokerage workstation vs wealth-management portal.
- Whether advanced analytical views get a darker mode later.

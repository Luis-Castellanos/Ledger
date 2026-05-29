# Fidelity Reference Analysis

## Purpose

This document translates the supplied Fidelity screenshots into a reusable Praxis Ledger design direction.

The goal is not to copy Fidelity's logo, brand identity, proprietary trade dress, exact page structure, or text. The goal is to extract durable product-design patterns that are appropriate for a serious personal finance ledger:

- Dense but readable financial work surfaces.
- Dark institutional palette with warm undertones.
- Clear green active and positive states.
- Strong tab, filter, card, and table hierarchy.
- Mature account-management layout patterns.

## Reference Summary

The screenshots show a high-density institutional finance interface with a dark visual system:

- A dark global header with primary navigation, utility links, and search.
- A warm dark-brown page canvas behind the main content.
- Graphite cards and account panels with visible rounded borders.
- Green active states for selected tabs, selected filters, and positive values.
- Large rounded cards for account summaries, transfer tracking, movers, and activity.
- A left account rail that supports account context without becoming the whole app navigation.
- Dense activity tables with muted column headers, strong row separators, and right-aligned money.

## Product Translation

Praxis Ledger should use this as the stronger reference direction:

- Dark institutional finance app, not decorative dark dashboard.
- Serious wealth-management feel, adapted to personal finance transactions.
- Full-viewport application, no decorative browser-frame padding.
- Financial tables and review queues as first-class work surfaces.
- Cards only where they group real account, balance, insight, or workflow content.
- Green as the primary active/success accent, used sparingly.
- Blue only for links and secondary informational actions.

Avoid:

- Fidelity logo, wordmark, exact navigation labels, exact copy, or exact information architecture.
- A brokerage/trading-first product feel.
- Oversized empty dashboard cards.
- Dark neon terminal styling.
- One-note black and green UI.

## Visual Tokens

These are starting targets, not final brand tokens.

```css
:root {
  --pl-page: #241b16;
  --pl-chrome: #171918;
  --pl-panel: #171b1b;
  --pl-panel-raised: #1b2020;
  --pl-panel-warm: #2a211b;

  --pl-border: #3b403d;
  --pl-border-strong: #6b665d;
  --pl-divider: #3a3a36;

  --pl-text: #eeeae4;
  --pl-text-soft: #c9c3ba;
  --pl-text-muted: #969088;
  --pl-text-faint: #706a63;

  --pl-green: #5f9f3c;
  --pl-green-bright: #8dda7a;
  --pl-green-bg: #1d321a;
  --pl-blue-link: #9bc9ff;
  --pl-loss: #e07b73;
  --pl-warning: #d6ad58;
}
```

### Color Rules

- Page background should be warm dark brown-black, not pure black.
- Header and core panels should be cooler graphite.
- Use green for active navigation, selected filters, positive money, and healthy status.
- Use blue for links only when it clearly reads as a text link.
- Keep borders visible enough to define panels on dark surfaces.
- Do not rely on color alone for positive, negative, selected, or warning states.

## Typography

Praxis should not use Fidelity's brand typography. Use Geist Sans or Inter as the app font and keep financial numbers tabular.

Suggested rules:

- UI font: Geist Sans or Inter.
- Numeric font: same font with `font-variant-numeric: tabular-nums`.
- Page title: `40-48px`, `700`, tight line height.
- Card title: `20-24px`, `700`.
- Body text: `15-17px`, `450-550`.
- Table body: `16-18px`, `500`.
- Table headers: `15-16px`, `500`, muted color.
- Utility/nav text: `14-16px`, `500`.
- Amounts: tabular, right aligned, slightly heavier than row text.

The screenshots use larger, more legible text than the current app. Praxis should move away from tiny mono labels for primary user-facing information.

## Shape And Lines

Fidelity's dark UI uses visible structure without excessive decoration.

Starting rules:

- Global shell: full viewport.
- Major content cards: `20-24px` radius.
- Account rail cards: `16-20px` radius.
- Pill buttons: `999px` radius.
- Inputs/search: `14-22px` radius depending on size.
- Standard borders: `1px`.
- Prominent card borders: `1.5px` or stronger contrast.
- Active tab underline: `4-5px`.
- Row separators: `1px`, medium-low contrast.
- Avoid deeply nested cards.

## Layout Patterns

### Global Chrome

Use a top global navigation model for the long-term product:

- Brand/product mark on the left.
- Primary modules across the header.
- Utility actions on the right.
- Search in the upper right.
- Secondary action rail below the header when the current section needs repeated commands.

Praxis-specific primary modules should eventually map to:

- Dashboard
- Transactions
- Accounts
- Cashflow
- Net Worth
- Planning
- Reports
- Settings

### Account Rail

The left rail in the screenshot is not generic navigation; it is account context.

For Praxis:

- Use it on Dashboard, Accounts, and Net Worth views.
- Show all accounts, grouped accounts, balances, freshness, and add/link account actions.
- Do not overload it with every app module.
- Keep app navigation separate from account context.

### Page Header And Tabs

Pattern:

- Large page title.
- Horizontal tab strip under title.
- Active tab has a thick green underline.
- A full-width muted divider anchors the tab row.

For Praxis:

- Transactions can use tabs such as All, Needs review, Transfers, Recurring, Rules applied.
- Accounts can use Summary, Balances, History, Statements, Connections.
- Imports can use Uploads, Mapping, Review, History.

### Action Pills

Use pill controls for high-frequency commands and filters:

- Filled or outlined dark pills.
- Icon left, label right.
- Selected state uses green border/background.
- Inactive state uses gray/brown border.
- Keep labels short.

### Tables

The activity screenshot is the strongest reference for transaction pages.

Table rules:

- Search and filters live above the table.
- Date range filter appears first.
- Status/filter chips follow.
- Refresh/export actions align right.
- Group rows by date period when useful.
- Column headers are muted and aligned with data.
- Money is right aligned.
- Rows have strong horizontal separators.
- Row height should be dense but tappable, roughly `64-80px` desktop.
- Expanded rows can reveal source text, category edits, splits, notes, attachments, and audit history.

## Page Application

### Dashboard

Use a three-part structure:

- Account rail on the left.
- Main account/ledger summary in the center.
- Right-side workflow/insight cards where useful.

Dashboard should answer:

- What changed?
- What needs review?
- Are imports healthy?
- Which accounts are stale?
- Where did cash move?

### Transactions

Use the old Gringotts Vault transaction-page layout as the interaction model, styled with the Fidelity-derived dark institutional system.

Required transaction page traits:

- Large rounded table/workbench panel.
- Search, date range, status filters, category filters, and export controls.
- Date-grouped rows.
- Expandable row detail.
- Review-needed state.
- Source/import provenance visible in detail.
- Compact but legible typography.

### Accounts

Use the supplied "All accounts" screenshot as the structural inspiration:

- Account context rail.
- Main account summary.
- Balance/freshness card.
- Account list and activity cards.
- Linked account actions.

### Settings

Settings should be user-facing and boring in the right way:

- Profile.
- Display preferences.
- Data export/backup.
- Connected institutions.
- Import defaults.
- Security/privacy.

Do not show internal production readiness checks, provider keys, deployment status, or database diagnostics to normal users.

## Implementation Order

1. Replace the current app shell with the Fidelity-derived full-viewport dark shell.
2. Create shared tokens for color, typography, radius, borders, and component states.
3. Rebuild navigation into global chrome plus contextual account rail.
4. Restyle Transactions first, because it is the core product surface.
5. Restyle Dashboard and Accounts next.
6. Normalize Settings into user-facing preferences.
7. Add light mode later only after the dark institutional system is coherent.

## Open Decisions

- Whether dark mode becomes the default product identity or one of two themes.
- Whether the account rail appears on every page or only account-centric pages.
- Whether global navigation moves fully to the top header in V1 or after core feature parity.
- How much warmth to keep in the page background versus a cooler graphite institutional look.

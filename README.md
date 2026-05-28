# Vault V1

Production rebuild scaffold for a single-user personal finance app. The product name is still a placeholder; the architecture is aimed at a private beta replacement for Monarch-style personal finance workflows.

## Stack

- Next.js App Router
- Clerk auth
- Neon Postgres
- Drizzle ORM
- Tailwind CSS
- Vitest + React Testing Library
- Playwright

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The dashboard can run locally without Clerk keys. Production fails closed until Clerk is configured.

## Required Environment

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
DATABASE_URL=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Database

Generate migrations after schema changes:

```bash
npm run db:generate
```

Apply migrations once `DATABASE_URL` points at Neon:

```bash
npm run db:migrate
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the GitHub, Vercel, Clerk, and Neon release checklist.

## Verification

```bash
npm run setup:check
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Current Product Boundary

V1 is a personal transaction ledger, not accounting software. It intentionally avoids double-entry, journal entries, general ledger, trial balance, and chart-of-accounts workflows.

Planned V1 workflow:

- Authenticated single-user ledger
- Accounts
- Two-level categories
- Manual transactions
- CSV import staging
- Import review and commit
- Merchant-to-category rules
- Dashboard analytics
- Export and backup package

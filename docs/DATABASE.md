# Database Operations

Vault V1 uses Neon Postgres with Drizzle migrations.

## Neon Project

- Project name: `Ledger`
- Project ID: `blue-unit-83495113`
- Primary branch: `main`
- Branch ID: `br-broad-brook-akc5cejj`
- Database: `neondb`
- Application role: `neondb_owner`

Do not commit database connection strings. Store `DATABASE_URL` only in local secret storage and Vercel environment variables.

## Migration Policy

Use checked-in SQL migrations from `src/lib/db/migrations`.

```bash
npm run db:check
npm run db:migrate
```

Do not use `db:push` against shared preview or production data. Generate migration files locally, review the SQL, then apply them to the target Neon database.

## Current State

The checked-in migrations have been applied to the Neon `Ledger` project on branch `main` as of May 28, 2026.

Vercel contains encrypted `DATABASE_URL` entries for Development, Preview, and Production. Verify the target environment before deployment:

```bash
npx vercel env ls
npm run setup:check
```

Production deployment still requires Clerk production keys before promotion.

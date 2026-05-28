# Deployment

Vault V1 targets Vercel + Neon Postgres + Clerk for private beta hosting.

## Environments

Use separate Clerk apps and Neon databases for local, preview, and production. Preview deployments must not point at production financial data.

Required variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
DATABASE_URL=""
NEXT_PUBLIC_APP_URL=""
```

## Local Verification

```bash
npm ci
npm run setup:check
npm run db:migrate
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

`npm run setup:check` verifies required env vars, local Vercel linking, and checked-in SQL migrations.
`npm run db:migrate` requires `DATABASE_URL`. Do not use `db:push` for production data.

## Vercel Setup

1. Create or select the Vercel project.
2. Add environment variables separately for Preview and Production.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed app URL for each environment.
4. Run migrations against the target Neon database before promoting a deployment.
5. Run `npm run setup:check` with the same env vars used by the deployment.
6. Open `/settings` after deploy and confirm Production readiness shows Clerk, Neon, and App URL configured.

Current Vercel project:

- Project: `ledger`
- Scope: `luis-castellanos-projects-253c5aa7`

Useful commands:

```bash
npx vercel env ls --scope luis-castellanos-projects-253c5aa7
npx vercel --yes --scope luis-castellanos-projects-253c5aa7
npx vercel deploy --prod --scope luis-castellanos-projects-253c5aa7
```

## GitHub Setup

Once the remote exists, push `main` and require the `CI / Verify` and `CI / Secret scan` jobs before merging.

```bash
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```

## Release Gate

A deployment is not ready for private beta unless:

- GitHub CI passes.
- Vercel build passes.
- Clerk sign-in/sign-up works.
- Neon migrations have been applied.
- `/settings` reports Clerk, Neon, and App URL configured.
- Demo mode is not the active persistence path after signing in.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const requiredEnv = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
];

const failures = [];
const clerkKeyMode = getClerkKeyMode(
  classifyClerkKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  classifyClerkKey(process.env.CLERK_SECRET_KEY),
);
const isProductionTarget = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

for (const key of requiredEnv) {
  if (!process.env[key]) {
    failures.push(`Missing ${key}`);
  }
}

if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("sk_")) {
  failures.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY appears to contain a secret key.");
}

if (isProductionTarget && clerkKeyMode !== "live") {
  failures.push(`Production Clerk keys must both be live keys. Current mode: ${clerkKeyMode}.`);
}

if (!existsSync(".vercel/project.json")) {
  failures.push("Missing .vercel/project.json. Run `npx vercel link --yes --project ledger --scope <scope>`.");
} else {
  const project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));

  if (!project.projectId || !project.orgId) {
    failures.push(".vercel/project.json is missing projectId or orgId.");
  }
}

const migrationsDir = join("src", "lib", "db", "migrations");
const hasMigration = existsSync(migrationsDir) && readdirSync(migrationsDir).some((file) => file.endsWith(".sql"));

if (!hasMigration) {
  failures.push("No SQL migrations found under src/lib/db/migrations.");
}

if (failures.length > 0) {
  console.error("Production setup is incomplete:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Production setup inputs are present. Clerk key mode: ${clerkKeyMode}. Run \`npm run db:migrate\` before production deploy.`);

function classifyClerkKey(value) {
  if (!value) {
    return "missing";
  }

  if (value.startsWith("pk_test_") || value.startsWith("sk_test_")) {
    return "test";
  }

  if (value.startsWith("pk_live_") || value.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
}

function getClerkKeyMode(publishableKeyMode, secretKeyMode) {
  if (publishableKeyMode === "missing" || secretKeyMode === "missing") {
    return "missing";
  }

  if (publishableKeyMode === secretKeyMode) {
    return publishableKeyMode;
  }

  if (publishableKeyMode === "unknown" || secretKeyMode === "unknown") {
    return "unknown";
  }

  return "mixed";
}

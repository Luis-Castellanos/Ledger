export type SetupStatus = {
  appUrlConfigured: boolean;
  clerkConfigured: boolean;
  clerkKeyMode: "missing" | "test" | "live" | "mixed" | "unknown";
  databaseConfigured: boolean;
  nodeEnv: string;
  vercelDetected: boolean;
  vercelEnvironment: string | null;
};

type SetupEnv = Partial<Record<string, string | undefined>>;

export function getSetupStatus(env: SetupEnv = process.env): SetupStatus {
  const clerkPublishableKeyMode = classifyClerkKey(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const clerkSecretKeyMode = classifyClerkKey(env.CLERK_SECRET_KEY);

  return {
    appUrlConfigured: Boolean(env.NEXT_PUBLIC_APP_URL),
    clerkConfigured: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY),
    clerkKeyMode: getClerkKeyMode(clerkPublishableKeyMode, clerkSecretKeyMode),
    databaseConfigured: Boolean(env.DATABASE_URL),
    nodeEnv: env.NODE_ENV ?? "development",
    vercelDetected: Boolean(env.VERCEL),
    vercelEnvironment: env.VERCEL_ENV ?? null,
  };
}

export function getSetupReadiness(status: SetupStatus) {
  const required = [status.appUrlConfigured, status.clerkConfigured, status.databaseConfigured];
  const readyCount = required.filter(Boolean).length;

  return {
    ready: readyCount === required.length,
    readyCount,
    requiredCount: required.length,
  };
}

function classifyClerkKey(value: string | undefined) {
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

function getClerkKeyMode(
  publishableKeyMode: ReturnType<typeof classifyClerkKey>,
  secretKeyMode: ReturnType<typeof classifyClerkKey>,
): SetupStatus["clerkKeyMode"] {
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

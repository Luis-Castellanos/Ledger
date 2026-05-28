export type SetupStatus = {
  appUrlConfigured: boolean;
  clerkConfigured: boolean;
  databaseConfigured: boolean;
  nodeEnv: string;
  vercelDetected: boolean;
  vercelEnvironment: string | null;
};

type SetupEnv = Partial<Record<string, string | undefined>>;

export function getSetupStatus(env: SetupEnv = process.env): SetupStatus {
  return {
    appUrlConfigured: Boolean(env.NEXT_PUBLIC_APP_URL),
    clerkConfigured: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY),
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

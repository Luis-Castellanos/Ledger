import { getSetupReadiness, getSetupStatus, type SetupEnv, type SetupStatus } from "./status";

export type HealthReport = {
  service: "ledger";
  ok: boolean;
  checkedAt: string;
  environment: string;
  vercelEnvironment: string | null;
  status: SetupStatus;
  readiness: ReturnType<typeof getSetupReadiness>;
};

type PingDatabase = () => Promise<void>;

export async function buildHealthReport(env: SetupEnv, now: Date, pingDatabase: PingDatabase): Promise<HealthReport> {
  const baseStatus = getSetupStatus(env);
  const status = {
    ...baseStatus,
    databaseReachable: await getDatabaseReachability(env, pingDatabase),
  };
  const readiness = getSetupReadiness(status);

  return {
    service: "ledger",
    ok: readiness.ready,
    checkedAt: now.toISOString(),
    environment: status.nodeEnv,
    vercelEnvironment: status.vercelEnvironment,
    status,
    readiness,
  };
}

async function getDatabaseReachability(env: SetupEnv, pingDatabase: PingDatabase) {
  if (!env.DATABASE_URL) {
    return null;
  }

  try {
    await pingDatabase();
    return true;
  } catch {
    return false;
  }
}

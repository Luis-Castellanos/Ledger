import { getHealthReport as getBaseHealthReport, type SetupEnv } from "./status";

export type HealthReport = ReturnType<typeof getBaseHealthReport> & {
  databaseReachable: boolean | null;
};

type PingDatabase = () => Promise<void>;

export async function buildHealthReport(env: SetupEnv, now: Date, pingDatabase: PingDatabase) {
  const report: HealthReport = {
    ...getBaseHealthReport(env, now),
    databaseReachable: null,
  };

  if (!env.DATABASE_URL) {
    return report;
  }

  try {
    await pingDatabase();
    report.databaseReachable = true;
  } catch {
    report.databaseReachable = false;
    report.ok = false;
  }

  return report;
}

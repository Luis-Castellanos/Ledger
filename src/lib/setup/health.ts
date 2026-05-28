import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { buildHealthReport } from "./health-report";
import type { SetupEnv } from "./status";

export async function getDeploymentHealthReport(env: SetupEnv = process.env, now = new Date()) {
  return buildHealthReport(env, now, pingConfiguredDatabase);
}

async function pingConfiguredDatabase() {
  await getDb().execute(sql`select 1`);
}

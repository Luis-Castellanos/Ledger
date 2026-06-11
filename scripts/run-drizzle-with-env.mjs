import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const command = process.argv[2];
const allowedCommands = new Set(["migrate"]);

if (!allowedCommands.has(command)) {
  console.error("Usage: node scripts/run-drizzle-with-env.mjs migrate");
  process.exit(1);
}

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const result = spawnSync("npx", ["drizzle-kit", command], {
  env: process.env,
  stdio: "inherit",
  // npx resolves to npx.cmd on Windows, which needs a shell to spawn
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

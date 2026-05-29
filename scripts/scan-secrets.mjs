import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => !isSkippedFile(file));

const detectors = [
  {
    name: "Clerk secret key",
    pattern: /\bsk_(?:test|live)_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "Clerk publishable key",
    pattern: /\bpk_(?:test|live)_[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "Postgres connection URL",
    pattern: /\bpostgres(?:ql)?:\/\/[^"'\s<>]+/gi,
  },
  {
    name: "Generic private key block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
];

const findings = [];
const allowedEnvExampleUrl = ["postgres", "://", "user:pass@example.neon.tech/db"].join("");
const allowedTestPostgresUrl = ["postgres", "://", "example"].join("");

for (const file of trackedFiles) {
  let text;

  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const detector of detectors) {
    for (const match of text.matchAll(detector.pattern)) {
      if (isAllowedExample(file, match[0])) {
        continue;
      }

      findings.push({
        file,
        line: getLineNumber(text, match.index ?? 0),
        type: detector.name,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Potential committed secrets found:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.type}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed across ${trackedFiles.length} tracked files.`);

function isSkippedFile(file) {
  return (
    file === "package-lock.json" ||
    file.endsWith(".png") ||
    file.endsWith(".jpg") ||
    file.endsWith(".jpeg") ||
    file.endsWith(".webp") ||
    file.endsWith(".gif") ||
    file.endsWith(".ico")
  );
}

function isAllowedExample(file, value) {
  if (file === ".env.example" && (value === allowedEnvExampleUrl || value.startsWith("pk_test_placeholder"))) {
    return true;
  }

  return file.endsWith(".test.ts") && value === allowedTestPostgresUrl;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

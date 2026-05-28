const sensitiveKeyPattern = /token|secret|password|cookie|authorization|database_url|connection|string|raw|description|notes/i;

export type ServerLogContext = Record<string, unknown>;

export function logServerError(event: string, error: unknown, context: ServerLogContext = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      error: serializeError(error),
      context: redactValue(context),
    }),
  );
}

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactValue(nestedValue)]),
  );
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: "Unknown server error",
  };
}

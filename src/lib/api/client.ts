export class ApiError extends Error {
  readonly status: number;
  readonly issues?: Record<string, string[]>;

  constructor(status: number, message: string, issues?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

type JsonBody = Record<string, unknown> | unknown[] | undefined;

async function request<T>(path: string, init?: RequestInit & { json?: JsonBody }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { error?: string; issues?: Record<string, string[]> };
    throw new ApiError(response.status, body.error || `Request failed (${response.status})`, body.issues);
  }

  // an expired session makes Clerk redirect API calls to the sign-in page;
  // a 200 HTML response is therefore "signed out", not data
  if (payload === null && (response.headers.get("content-type") ?? "").includes("text/html")) {
    throw new ApiError(401, "Your session has ended — sign in again.");
  }

  return payload as T;
}

export const apiFetch = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, json?: JsonBody) => request<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: JsonBody) => request<T>(path, { method: "PATCH", json }),
  delete: <T>(path: string, json?: JsonBody) => request<T>(path, { method: "DELETE", json }),
};

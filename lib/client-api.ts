export interface ApiResult {
  ok: boolean;
  status: number;
  error: string | null;
  data: Record<string, unknown> | null;
}

const NETWORK_ERROR = "Network error. Check your connection and try again.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function postJson(path: string, body: unknown): Promise<ApiResult> {
  return requestJson("POST", path, body);
}

export async function patchJson(path: string, body: unknown): Promise<ApiResult> {
  return requestJson("PATCH", path, body);
}

export async function deleteJson(path: string): Promise<ApiResult> {
  return requestJson("DELETE", path, undefined);
}

async function requestJson(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body: unknown
): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, status: res.status, error: null, data };

    let error = typeof data.error === "string" ? data.error : GENERIC_ERROR;
    if (res.status === 429 && typeof data.retryAfterSeconds === "number") {
      error = `${error} Try again in ${data.retryAfterSeconds}s.`;
    }
    return { ok: false, status: res.status, error, data };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR, data: null };
  }
}

export function safeNextPath(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

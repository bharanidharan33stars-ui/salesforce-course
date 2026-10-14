import { API_URL } from "./constants";

/**
 * Typed fetch wrapper for the Express API.
 *
 * - Sends the session cookie (credentials: "include").
 * - Attaches the CSRF token cookie value to every state-changing request.
 * - Normalises every response into either `data` or a thrown ApiClientError,
 *   so pages only ever deal with one error type.
 */

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Query string parameters; undefined/null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip JSON parsing (used for PDF downloads). */
  raw?: boolean;
}

/**
 * Resolves the API base for the current runtime.
 *
 * - Browser + relative base ("/api"): keep it relative - the request then goes
 *   to the Next origin and is proxied to Express (works on this PC and on a
 *   phone over Wi-Fi, same-origin, no CORS).
 * - Server (Node, e.g. a server component calling this client): fetch() there
 *   cannot parse relative URLs, so resolve against the address the Next server
 *   proxies to (API_PROXY_TARGET, default localhost:4000).
 * - Absolute base: always used as-is.
 */
function serverResolvedBase(): string {
  if (/^https?:\/\//i.test(API_URL)) return API_URL;
  if (typeof window === "undefined") {
    // On Vercel the Express API is a function of THIS deployment - call it
    // over the deployment URL instead of the local proxy target.
    if (process.env.VERCEL) {
      const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
      if (host) return `https://${host}${API_URL}`;
    }
    const target =
      (typeof process !== "undefined" && process.env ? process.env.API_PROXY_TARGET : undefined) ||
      "http://localhost:4000";
    return `${target.replace(/\/$/, "")}${API_URL}`;
  }
  return API_URL;
}

function buildUrl(methodPath: string, query?: RequestOptions["query"]): string {
  const raw = `${serverResolvedBase()}${methodPath}`;
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();

  // Absolute base (API on another host): use the URL parser.
  if (/^https?:\/\//i.test(API_URL)) {
    const parsed = new URL(raw);
    if (qs) parsed.search = qs;
    return parsed.toString();
  }
  // Relative base ("/api"): the browser resolves it against the current origin.
  return qs ? `${raw}?${qs}` : raw;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query);

  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  const csrf = readCookie("sla_csrf");
  if (csrf && UNSAFE.has(method)) headers.set("x-csrf-token", csrf);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...options,
      method,
      headers,
      credentials: "include",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "We could not reach the server. Check your connection and try again.",
    );
  }

  if (options.raw) {
    if (!response.ok) {
      throw new ApiClientError(response.status, "DOWNLOAD_FAILED", "The file could not be downloaded.");
    }
    return (await response.blob()) as unknown as T;
  }

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
    const errorBody = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ApiClientError(
      response.status,
      errorBody?.error?.code ?? "REQUEST_FAILED",
      errorBody?.error?.message ?? `Request failed with status ${response.status}.`,
      errorBody?.error?.details,
    );
  }

  const body = payload as { success?: boolean; data?: T } | null;
  return (body && "data" in body ? body.data : payload) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),

  /** Downloads a protected PDF and returns an object URL for the browser. */
  async download(path: string, filename: string): Promise<void> {
    const blob = await request<Blob>("GET", path, { raw: true });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Give the browser a moment before revoking.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  },
};

/** One-line message for any thrown error, safe to render directly. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

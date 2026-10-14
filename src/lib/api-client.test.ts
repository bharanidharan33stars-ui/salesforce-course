import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";

/**
 * Browser runtime (jsdom): the API base stays relative ("/api/..."), so every
 * request goes to the Next origin and is proxied to Express - same-origin on
 * this PC and on a phone over Wi-Fi, no CORS, cookies just work.
 */

type FetchCall = [string, RequestInit | undefined];

function stubFetch(status = 200, body: unknown = { success: true, data: { ok: true } }) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push([url, init]);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      blob: async () => new Blob([]),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "sla_csrf=; Max-Age=0; path=/";
});

describe("api client in the browser", () => {
  it("keeps /api requests relative and appends query parameters", async () => {
    const { calls } = stubFetch();

    await api.get("/student/lessons/unit/introduction-to-salesforce/environments-and-setup");

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(
      "/api/student/lessons/unit/introduction-to-salesforce/environments-and-setup",
    );
    expect(calls[0][1]?.credentials).toBe("include");
  });

  it("drops empty query values instead of sending blanks", async () => {
    const { calls } = stubFetch();
    await api.get("/admin/students", { query: { page: 2, search: "", status: undefined } });
    expect(calls[0][0]).toBe("/api/admin/students?page=2");
  });

  it("echoes the CSRF cookie on mutations only", async () => {
    document.cookie = "sla_csrf=token-abc";
    const { calls } = stubFetch();

    await api.post("/auth/logout");
    const headers = new Headers(calls[0][1]?.headers);
    expect(headers.get("x-csrf-token")).toBe("token-abc");
    expect(calls[0][1]?.method).toBe("POST");
    expect(calls[0][1]?.body).toBeUndefined();

    await api.get("/auth/me");
    const getHeaders = new Headers(calls[1][1]?.headers);
    expect(getHeaders.get("x-csrf-token")).toBeNull();
    expect(getHeaders.get("content-type")).toBeNull();
  });

  it("serialises JSON bodies with the right content type", async () => {
    const { calls } = stubFetch();
    await api.post("/auth/login", { email: "a@b.c", password: "x" });

    const headers = new Headers(calls[0][1]?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(calls[0][1]?.body).toBe(JSON.stringify({ email: "a@b.c", password: "x" }));
  });
});

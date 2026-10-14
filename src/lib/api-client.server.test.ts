// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiClientError } from "@/lib/api-client";

/**
 * Server runtime (Node): the API base "/api" is relative, which plain fetch()
 * cannot parse. Server components (home, course pages) therefore resolve it
 * against API_PROXY_TARGET - the address the Next server proxies to.
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
  delete process.env.API_PROXY_TARGET;
});

describe("api client on the server", () => {
  it("resolves the relative /api base to the proxy target", async () => {
    const { calls } = stubFetch();

    const data = await api.get<{ ok: boolean }>("/health", { query: { a: 1, skip: undefined, empty: "" } });

    expect(data).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("http://localhost:4000/api/health?a=1");
    expect(calls[0][1]?.credentials).toBe("include");
  });

  it("honours API_PROXY_TARGET when the backend runs elsewhere", async () => {
    process.env.API_PROXY_TARGET = "http://10.13.243.23:4000/";
    const { calls } = stubFetch();

    await api.get("/courses");
    expect(calls[0][0]).toBe("http://10.13.243.23:4000/api/courses");
  });

  it("maps error envelopes to ApiClientError", async () => {
    stubFetch(404, {
      success: false,
      error: { code: "NOT_FOUND", message: "Course not found." },
    });

    await expect(api.get("/courses/nope")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 404,
      code: "NOT_FOUND",
      message: "Course not found.",
    });
    await expect(api.get("/courses/nope")).rejects.toBeInstanceOf(ApiClientError);
  });

  it("turns a thrown network error into a friendly ApiClientError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    await expect(api.get("/health")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });
});

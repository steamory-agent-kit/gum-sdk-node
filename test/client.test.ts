import { describe, expect, it, vi } from "vitest";
import { GumApiError, GumConnectionError, GumTimeoutError } from "../src/errors";
import { GumClient, Session } from "../src";
import type { FetchLike } from "../src/types";

describe("GumClient", () => {
  it("uses the default host with https", async () => {
    const fetch = createJsonFetch({ status: "ok" });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.health();

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/healthz",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("normalizes host values and keeps explicit protocols", async () => {
    const fetch = createJsonFetch({ status: "ok" });
    const client = new GumClient({
      apiKey: "test-key",
      host: "http://82.156.243.235:8000/",
      fetch,
    });

    await client.health();

    expect(fetch).toHaveBeenCalledWith(
      "http://82.156.243.235:8000/healthz",
      expect.anything(),
    );
  });

  it("normalizes plain custom host values to https", async () => {
    const fetch = createJsonFetch({ status: "ok" });
    const client = new GumClient({
      apiKey: "test-key",
      host: "gum.example.com/",
      fetch,
    });

    await client.health();

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.example.com/healthz",
      expect.anything(),
    );
  });

  it("rejects empty api keys and hosts", () => {
    expect(() => new GumClient({ apiKey: "  ", fetch: createJsonFetch({}) })).toThrow(
      "apiKey must not be empty",
    );

    expect(
      () => new GumClient({ apiKey: "test-key", host: "  ", fetch: createJsonFetch({}) }),
    ).toThrow("host must not be empty");
  });

  it("sends Authorization with Api-Key prefix", async () => {
    const fetch = createJsonFetch({ data: { session_id: "session_123" } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.sessions.create({ user_id: "user_123", title: "demo" });

    expect(headersFor(fetch).Authorization).toBe("Api-Key test-key");
  });

  it("does not duplicate an existing Api-Key prefix", async () => {
    const fetch = createJsonFetch({ data: { session_id: "session_123" } });
    const client = new GumClient({ apiKey: "Api-Key test-key", fetch });

    await client.sessions.create({ user_id: "user_123", title: "demo" });

    expect(headersFor(fetch).Authorization).toBe("Api-Key test-key");
  });

  it("creates a Session", async () => {
    const fetch = createJsonFetch({ data: { session_id: "session_123" } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    const session = await client.sessions.create({
      user_id: "user_123",
      title: "demo",
      metadata: { source: "test" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          user_id: "user_123",
          title: "demo",
          metadata: { source: "test" },
        }),
      }),
    );
    expect(session).toBeInstanceOf(Session);
    expect(session.id).toBe("session_123");
    expect(session.rawResponse).toEqual({ data: { session_id: "session_123" } });
  });

  it("creates a Session with the required user id", async () => {
    const fetch = createJsonFetch({ data: { session_id: "session_123" } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    const session = await client.sessions.create({ user_id: "user_123" });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ user_id: "user_123" }),
      }),
    );
    expect(session.id).toBe("session_123");
  });

  it("throws a clear error when create does not return a Session id", async () => {
    const fetch = createJsonFetch({ data: {} });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(client.sessions.create({ user_id: "user_123" })).rejects.toThrow(
      "Gum API did not return data.session_id",
    );
  });

  it("restores a Session object from an existing Session id without a request", () => {
    const fetch = createJsonFetch({ data: { accepted: true } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    const session = client.sessions.fromId("session_123");

    expect(session).toBeInstanceOf(Session);
    expect(session.id).toBe("session_123");
    expect(session.rawResponse).toEqual({ data: { session_id: "session_123" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses a restored Session object to add messages", async () => {
    const fetch = createJsonFetch({ data: { accepted: true } });
    const client = new GumClient({ apiKey: "test-key", fetch });
    const session = client.sessions.fromId("session/123");

    await expect(
      session.addMessage({
        role: "user",
        content: "hello",
      }),
    ).resolves.toEqual({ data: { accepted: true } });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions/session%2F123/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );
  });

  it("adds one message through a Session object", async () => {
    const fetch = createJsonFetchSequence(
      { data: { session_id: "session/123" } },
      { data: { accepted: true } },
    );
    const client = new GumClient({ apiKey: "test-key", fetch });
    const session = await client.sessions.create({ user_id: "user_123" });

    await expect(
      session.addMessage({
        role: "user",
        content: "hello",
      }),
    ).resolves.toEqual({ data: { accepted: true } });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://gum.asix.inc/api/sessions/session%2F123/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      }),
    );
  });

  it("adds messages through a Session object", async () => {
    const fetch = createJsonFetchSequence(
      { data: { session_id: "session_123" } },
      { data: { accepted: true } },
    );
    const client = new GumClient({ apiKey: "test-key", fetch });
    const session = await client.sessions.create({ user_id: "user_123" });

    await expect(
      session.addMessages({
        user_id: "user_123",
        messages: [{ role: "assistant", content: "hi" }],
      }),
    ).resolves.toEqual({ data: { accepted: true } });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          user_id: "user_123",
          messages: [{ role: "assistant", content: "hi" }],
        }),
      }),
    );
  });

  it("gets memory through a Session object", async () => {
    const fetch = createJsonFetchSequence(
      { data: { session_id: "session_123" } },
      { data: { messages: [] } },
    );
    const client = new GumClient({ apiKey: "test-key", fetch });
    const session = await client.sessions.create({ user_id: "user_123" });

    await expect(
      session.getMemory({
        query: "订单",
        details: true,
      }),
    ).resolves.toEqual({ data: { messages: [] } });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/context?query=%E8%AE%A2%E5%8D%95&details=true",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets memory through a Session object with recall config using POST", async () => {
    const fetch = createJsonFetchSequence(
      { data: { session_id: "session_123" } },
      { data: { messages: [] } },
    );
    const client = new GumClient({ apiKey: "test-key", fetch });
    const session = await client.sessions.create({ user_id: "user_123" });

    await expect(
      session.getMemory({
        query: "订单",
        details: true,
        recall_config: {
          message_recent_limit: 20,
          message_semantic_top_k: 8,
          query_router: "single_hop_parallel",
          enable_long_term_recall: false,
        },
      }),
    ).resolves.toEqual({ data: { messages: [] } });

    expect(fetch).toHaveBeenLastCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/context?query=%E8%AE%A2%E5%8D%95&details=true",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          recall_config: {
            message_recent_limit: 20,
            message_semantic_top_k: 8,
            query_router: "single_hop_parallel",
            enable_long_term_recall: false,
          },
        }),
      }),
    );
  });

  it("adds messages from an array shorthand", async () => {
    const fetch = createJsonFetch({ data: {} });
    const client = new GumClient({ apiKey: "test-key", fetch });
    const timestamp = new Date("2026-04-22T00:00:00.000Z");

    await client.sessions.addMessages("session/123", [
      { role: "user", content: "hello", timestamp },
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions/session%2F123/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "hello",
              timestamp: "2026-04-22T00:00:00.000Z",
            },
          ],
        }),
      }),
    );
  });

  it("adds messages from an explicit AddMessagesRequest body", async () => {
    const fetch = createJsonFetch({ data: {} });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.sessions.addMessages("session_123", {
      messages: [{ role: "assistant", content: "hi", metadata: { ignored: undefined } }],
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "assistant", content: "hi", metadata: {} }],
        }),
      }),
    );
  });

  it("gets Session memory with query params", async () => {
    const fetch = createJsonFetch({ data: { messages: [] } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.sessions.getMemory("session_123", {
      query: "订单",
      details: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/context?query=%E8%AE%A2%E5%8D%95&details=true",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets Session memory with recall config using POST", async () => {
    const fetch = createJsonFetch({ data: { messages: [] } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.sessions.getMemory("session_123", {
      query: "订单",
      details: true,
      recall_config: {
        message_recent_limit: 20,
        query_router: "multi_hop_chain",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/context?query=%E8%AE%A2%E5%8D%95&details=true",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          recall_config: {
            message_recent_limit: 20,
            query_router: "multi_hop_chain",
          },
        }),
      }),
    );
  });

  it("omits undefined Session memory query params", async () => {
    const fetch = createJsonFetch({ data: { messages: [] } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.sessions.getMemory("session_123");

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/sessions/session_123/context",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates a user action and serializes Date timestamps", async () => {
    const fetch = createJsonFetch({});
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(
      client.userActions.create({
        user_id: "user_123",
        timestamp: new Date("2026-04-22T01:02:03.000Z"),
        content: "用户点击了订单详情",
        event_type: "click",
      }),
    ).resolves.toEqual({});

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/user/actions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          user_id: "user_123",
          timestamp: "2026-04-22T01:02:03.000Z",
          content: "用户点击了订单详情",
          event_type: "click",
        }),
      }),
    );
  });

  it("preserves string timestamps for user actions", async () => {
    const fetch = createJsonFetch({ data: { log_id: "log_123" } });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await client.userActions.create({
      user_id: "user_123",
      timestamp: "2026-04-22T01:02:03.000Z",
      content: "用户点击了订单详情",
      metadata: { optional: undefined, source: "test" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://gum.asix.inc/api/user/actions",
      expect.objectContaining({
        body: JSON.stringify({
          user_id: "user_123",
          timestamp: "2026-04-22T01:02:03.000Z",
          content: "用户点击了订单详情",
          metadata: { source: "test" },
        }),
      }),
    );
  });

  it("supports per-request headers and timeout overrides", async () => {
    const fetch = createJsonFetch({ status: "ok" });
    const client = new GumClient({ apiKey: "test-key", fetch, timeoutMs: 1 });

    await client.health({
      timeoutMs: 0,
      headers: { "X-Test-Header": "enabled" },
    });

    expect(headersFor(fetch)["X-Test-Header"]).toBe("enabled");
  });

  it("returns undefined for empty successful responses", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(client.health()).resolves.toBeUndefined();
  });

  it("returns text for non-json successful responses", async () => {
    const fetch = vi.fn(async () =>
      new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(client.health()).resolves.toBe("ok");
  });

  it("returns text when content-type is missing", async () => {
    const fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(client.health()).resolves.toBe("ok");
  });

  it("uses global fetch when no custom fetch is provided", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);

    try {
      const client = new GumClient({ apiKey: "test-key" });

      await client.health();

      expect(fetch).toHaveBeenCalledWith(
        "https://gum.asix.inc/healthz",
        expect.objectContaining({ method: "GET" }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("throws GumApiError for non-2xx responses", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: "invalid api_key" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new GumClient({ apiKey: "bad-key", fetch });

    await expect(client.health()).rejects.toMatchObject({
      name: "GumApiError",
      status: 401,
      detail: "invalid api_key",
    } satisfies Partial<GumApiError>);
  });

  it("uses a generic GumApiError message when detail is not a string", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: [{ msg: "bad" }] }), {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new GumClient({ apiKey: "bad-key", fetch });

    await expect(client.health()).rejects.toMatchObject({
      name: "GumApiError",
      message: "Gum API request failed with status 422",
      status: 422,
      detail: [{ msg: "bad" }],
    } satisfies Partial<GumApiError>);
  });

  it("uses a generic GumApiError message when error bodies do not contain detail", async () => {
    const fetch = vi.fn(async () =>
      new Response("unauthorized", {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "text/plain" },
      }),
    );
    const client = new GumClient({ apiKey: "bad-key", fetch });

    await expect(client.health()).rejects.toMatchObject({
      name: "GumApiError",
      message: "Gum API request failed with status 401",
      status: 401,
      body: "unauthorized",
      detail: undefined,
    } satisfies Partial<GumApiError>);
  });

  it("throws GumConnectionError for fetch failures", async () => {
    const cause = new TypeError("fetch failed");
    const fetch = vi.fn(async () => {
      throw cause;
    });
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(client.health()).rejects.toMatchObject({
      name: "GumConnectionError",
      cause,
    } satisfies Partial<GumConnectionError>);
  });

  it("throws GumTimeoutError when requests time out", async () => {
    const fetch = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const client = new GumClient({ apiKey: "test-key", fetch, timeoutMs: 1 });

    await expect(client.health()).rejects.toBeInstanceOf(GumTimeoutError);
  });

  it("throws GumTimeoutError when an external signal is already aborted", async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException("aborted", "AbortError");
      }

      return new Response("{}");
    });
    const controller = new AbortController();
    controller.abort();
    const client = new GumClient({ apiKey: "test-key", fetch });

    await expect(client.health({ signal: controller.signal })).rejects.toBeInstanceOf(
      GumTimeoutError,
    );
  });
});

function createJsonFetch(body: unknown): FetchLike {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function createJsonFetchSequence(...bodies: unknown[]): FetchLike {
  let index = 0;

  return vi.fn(async () => {
    const body = bodies[Math.min(index, bodies.length - 1)];
    index += 1;

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

function headersFor(fetch: FetchLike): Record<string, string> {
  const calls = vi.mocked(fetch).mock.calls;
  const init = calls.at(-1)?.[1];
  return init?.headers as Record<string, string>;
}

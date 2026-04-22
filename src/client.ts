import { GumApiError, GumConnectionError, GumTimeoutError } from "./errors";
import { SessionsResource } from "./resources/sessions";
import { UserActionsResource } from "./resources/user-actions";
import type { FetchLike, GumClientOptions, RequestOptions } from "./types";
import { normalizeHost } from "./utils/normalize-host";
import { serializeBody } from "./utils/serialize";

const DEFAULT_TIMEOUT_MS = 30_000;

export class GumClient {
  readonly host: string;
  readonly timeoutMs: number;
  readonly sessions: SessionsResource;
  readonly userActions: UserActionsResource;

  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;

  constructor(options: GumClientOptions) {
    this.apiKey = normalizeApiKey(options.apiKey);
    this.host = normalizeHost(options.host);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.sessions = new SessionsResource(this);
    this.userActions = new UserActionsResource(this);
  }

  async health(options?: RequestOptions): Promise<unknown> {
    return this.request("GET", "/healthz", undefined, options);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timeout = timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

    const signal = anySignal([controller.signal, options.signal]);

    try {
      const response = await this.fetchFn(`${this.host}${path}`, {
        method,
        headers: {
          "Authorization": this.apiKey,
          "Accept": "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...options.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(serializeBody(body)),
        signal,
      });

      const parsedBody = await parseResponseBody(response);

      if (!response.ok) {
        throw new GumApiError({
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: parsedBody,
        });
      }

      return parsedBody as T;
    } catch (error) {
      if (error instanceof GumApiError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new GumTimeoutError(timeoutMs, error);
      }

      throw new GumConnectionError("Gum API request failed", error);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }
}

function normalizeApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();

  if (trimmed.length === 0) {
    throw new Error("apiKey must not be empty");
  }

  return trimmed.startsWith("Api-Key ") ? trimmed : `Api-Key ${trimmed}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  return text;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal {
  const definedSignals = signals.filter((signal): signal is AbortSignal => Boolean(signal));

  if (definedSignals.length === 1) {
    return definedSignals[0]!;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  for (const signal of definedSignals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener("abort", abort, { once: true });
  }

  return controller.signal;
}

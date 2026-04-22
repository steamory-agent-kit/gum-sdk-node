export class GumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GumError";
  }
}

export class GumApiError extends GumError {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body: unknown;
  readonly detail: unknown;

  constructor(options: {
    status: number;
    statusText: string;
    headers: Headers;
    body: unknown;
  }) {
    const detail = getErrorDetail(options.body);
    super(
      typeof detail === "string"
        ? detail
        : `Gum API request failed with status ${options.status}`,
    );
    this.name = "GumApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.headers = options.headers;
    this.body = options.body;
    this.detail = detail;
  }
}

export class GumConnectionError extends GumError {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "GumConnectionError";
    this.cause = cause;
  }
}

export class GumTimeoutError extends GumConnectionError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, cause: unknown) {
    super(`Gum API request timed out after ${timeoutMs}ms`, cause);
    this.name = "GumTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

function getErrorDetail(body: unknown): unknown {
  if (body && typeof body === "object" && "detail" in body) {
    return (body as { detail: unknown }).detail;
  }

  return undefined;
}

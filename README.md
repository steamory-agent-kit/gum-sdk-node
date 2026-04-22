# @steamory-agent-kit/gum-sdk

[![npm version](https://img.shields.io/npm/v/@steamory-agent-kit/gum-sdk.svg)](https://www.npmjs.com/package/@steamory-agent-kit/gum-sdk)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

TypeScript-first Node.js SDK for the Gum API. Use it to create conversation
Sessions, append messages, retrieve contextual memory, and write user action
events from Node.js applications.

## Features

- Fully typed TypeScript API.
- ESM and CommonJS builds.
- Works on Node.js 18+ with the built-in Fetch API.
- Optional custom `fetch` implementation for tests, proxies, and custom runtimes.
- Automatic `Date` serialization and undefined-value cleanup for request bodies.
- Request timeout support with typed API errors, connection errors, and timeout errors.

## Installation

```sh
npm install @steamory-agent-kit/gum-sdk
```

## Quick Start

```ts
import { GumClient } from "@steamory-agent-kit/gum-sdk";

const apiKey = process.env.GUM_API_KEY;

if (!apiKey) {
  throw new Error("Missing GUM_API_KEY");
}

const gum = new GumClient({ apiKey });

const session = await gum.sessions.create({
  title: "Support session",
  metadata: {
    source: "node",
  },
});

const sessionId = session.data?.thread_id;

if (!sessionId) {
  throw new Error("Gum did not return a Session id (thread_id)");
}

await gum.sessions.addMessages(sessionId, [
  {
    role: "user",
    content: "I want to check my order",
  },
]);

const context = await gum.sessions.getContext(sessionId, {
  query: "order",
  details: true,
});

await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "User clicked the order details page",
  event_type: "click",
  page: "order_detail",
});

console.log(context.data);
```

## Configuration

```ts
import { GumClient } from "@steamory-agent-kit/gum-sdk";

const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
  host: "gum.asix.inc",
  timeoutMs: 30_000,
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Required | Gum API key. The SDK sends it as `Authorization: Api-Key <apiKey>`. Passing a value that already starts with `Api-Key ` is also supported. |
| `host` | `string` | `gum.asix.inc` | Gum service host override. Plain host values are normalized to HTTPS, so `gum.asix.inc` becomes `https://gum.asix.inc`. Explicit `http://` or `https://` URLs are preserved. |
| `timeoutMs` | `number` | `30000` | Default request timeout in milliseconds. Set to `0` to disable the SDK timeout. |
| `fetch` | `FetchLike` | `globalThis.fetch` | Custom Fetch-compatible implementation for tests, proxies, or custom runtimes. |

## API Reference

### `new GumClient(options)`

Creates a client instance. The client exposes resource groups under
`gum.sessions` and `gum.userActions`.

```ts
const gum = new GumClient({
  apiKey: "gum_api_key",
});
```

### `gum.health(options?)`

Checks the Gum service health endpoint.

```ts
const health = await gum.health();
```

### `gum.sessions.create(input?, options?)`

Creates a Session.

```ts
const session = await gum.sessions.create({
  title: "Demo session",
  metadata: {
    source: "node",
  },
});
```

### `gum.sessions.addMessages(sessionId, input, options?)`

Adds messages to a Session. `input` can be either a direct message array or an
object with a `messages` property.

```ts
await gum.sessions.addMessages("session_123", [
  {
    role: "user",
    content: "Hello",
  },
  {
    role: "assistant",
    content: "Hi, how can I help?",
  },
]);

await gum.sessions.addMessages("session_123", {
  messages: [
    {
      role: "user",
      content: "Can you remember this preference?",
      metadata: {
        channel: "chat",
      },
    },
  ],
});
```

### `gum.sessions.getContext(sessionId, params?, options?)`

Retrieves context for a Session. Pass `query` to focus the retrieval and
`details` to include detailed context data when the API supports it.

```ts
const context = await gum.sessions.getContext("session_123", {
  query: "order",
  details: true,
});
```

### `gum.userActions.create(input, options?)`

Creates one user action log.

```ts
await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "User searched for nearby restaurants",
  session_id: "session_123",
  event_type: "search",
  page: "home",
  anchors: {
    order_id: "order_123",
  },
  metadata: {
    source: "backend",
  },
});
```

## Request Options

Every SDK method accepts optional request options as its last argument.

```ts
const controller = new AbortController();

await gum.sessions.getContext(
  "session_123",
  { query: "order" },
  {
    timeoutMs: 5_000,
    signal: controller.signal,
    headers: {
      "X-Request-Id": "request_123",
    },
  },
);
```

| Option | Type | Description |
| --- | --- | --- |
| `timeoutMs` | `number` | Overrides the client timeout for one request. |
| `signal` | `AbortSignal` | External abort signal. |
| `headers` | `HeadersInit` | Additional request headers. |

## Response Shape

Resource methods return the Gum response envelope:

```ts
type GumEnvelope<T = unknown> = {
  data?: T;
  success?: boolean;
  message?: string;
  error?: unknown;
  [key: string]: unknown;
};
```

For example, `gum.sessions.create()` returns
`Promise<GumEnvelope<CreateSessionResponse>>`, where `data.thread_id` contains
the created Session id when the API returns it.

## Error Handling

```ts
import {
  GumApiError,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum-sdk";

try {
  await gum.sessions.create({ title: "Demo session" });
} catch (error) {
  if (error instanceof GumApiError) {
    console.error(error.status, error.detail, error.body);
  } else if (error instanceof GumTimeoutError) {
    console.error(`Request timed out after ${error.timeoutMs}ms`);
  } else if (error instanceof GumConnectionError) {
    console.error("Network or fetch failure", error.cause);
  } else {
    throw error;
  }
}
```

| Error | When it is thrown |
| --- | --- |
| `GumApiError` | Gum returns a non-2xx response. Includes `status`, `statusText`, `headers`, `body`, and `detail`. |
| `GumConnectionError` | The underlying fetch request fails before a response is received. |
| `GumTimeoutError` | A request is aborted by timeout or an `AbortSignal`. Extends `GumConnectionError`. |

## TypeScript

The package ships generated type declarations. Public types are exported from
the package root:

```ts
import type {
  ActionLogInput,
  GumClientOptions,
  Message,
  SessionContext,
} from "@steamory-agent-kit/gum-sdk";
```

Session public types use the same naming as the `gum.sessions` resource group.

## Development

```sh
npm install
npm run typecheck
npm test
npm run test:coverage
npm run build
```

## Publishing

The repository includes a `.gitlab-ci.yml` pipeline for verifying, building, and
publishing this SDK to npm.

GitLab requirements:

- Add a masked and protected CI/CD variable named `NPM_TOKEN`.
- `NPM_TOKEN` must contain an npm granular access token with publish permission for
  `@steamory-agent-kit/gum-sdk`.
- If the npm account or package requires 2FA for publishing, create the token
  with bypass 2FA enabled. Otherwise the publish job will fail with `EOTP`.
- For a one-off manual publish with a non-bypass token, run the `publish` job
  manually and add a temporary `NPM_OTP` variable containing the current
  authenticator code.

Pipeline flow:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
npm publish --access public --tag latest
```

The publish job runs automatically for Git tags and can be run manually from the
default branch. Automatic tag publishing requires an `NPM_TOKEN` that can publish
without an interactive OTP prompt. Before publishing, update the `version` in
`package.json`. npm does not allow publishing the same package version twice.

## Contributing

Issues and pull requests are welcome. For code changes, please run the local
checks before opening a pull request:

```sh
npm run typecheck
npm test
npm run build
```

## License

MIT

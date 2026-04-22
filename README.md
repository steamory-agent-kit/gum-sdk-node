# @steamory-agent-kit/gum-sdk

[![npm version](https://img.shields.io/npm/v/@steamory-agent-kit/gum-sdk.svg)](https://www.npmjs.com/package/@steamory-agent-kit/gum-sdk)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

TypeScript-first Node.js SDK for the Gum API. Use it to create conversation
threads, append messages, retrieve contextual memory, and write user action
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

const thread = await gum.threads.create({
  title: "Support session",
  metadata: {
    source: "node",
  },
});

const threadId = thread.data?.thread_id;

if (!threadId) {
  throw new Error("Gum did not return a thread_id");
}

await gum.threads.addMessages(threadId, [
  {
    role: "user",
    content: "I want to check my order",
  },
]);

const context = await gum.threads.getContext(threadId, {
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
`gum.threads` and `gum.userActions`.

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

### `gum.threads.create(input?, options?)`

Creates a thread.

```ts
const thread = await gum.threads.create({
  title: "Demo thread",
  metadata: {
    source: "node",
  },
});
```

### `gum.threads.addMessages(threadId, input, options?)`

Adds messages to a thread. `input` can be either a direct message array or an
object with a `messages` property.

```ts
await gum.threads.addMessages("thread_123", [
  {
    role: "user",
    content: "Hello",
  },
  {
    role: "assistant",
    content: "Hi, how can I help?",
  },
]);

await gum.threads.addMessages("thread_123", {
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

### `gum.threads.getContext(threadId, params?, options?)`

Retrieves context for a thread. Pass `query` to focus the retrieval and
`details` to include detailed context data when the API supports it.

```ts
const context = await gum.threads.getContext("thread_123", {
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

await gum.threads.getContext(
  "thread_123",
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

For example, `gum.threads.create()` returns
`Promise<GumEnvelope<CreateThreadResponse>>`, where `data.thread_id` contains
the created thread id when the API returns it.

## Error Handling

```ts
import {
  GumApiError,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum-sdk";

try {
  await gum.threads.create({ title: "Demo thread" });
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
  ThreadContext,
} from "@steamory-agent-kit/gum-sdk";
```

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
- `NPM_TOKEN` must contain an npm automation token with publish permission for
  `@steamory-agent-kit/gum-sdk`.

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
default branch. Before publishing, update the `version` in `package.json`. npm
does not allow publishing the same package version twice.

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

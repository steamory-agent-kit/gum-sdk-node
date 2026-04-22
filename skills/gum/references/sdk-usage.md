# Gum SDK Usage Reference

Use this reference when implementing or reviewing `@steamory-agent-kit/gum` integration details.

## Contents

- [Installation](#installation)
- [Client Setup](#client-setup)
- [Sessions](#sessions)
- [Messages](#messages)
- [Context Recall](#context-recall)
- [User Actions](#user-actions)
- [Request Options](#request-options)
- [Response Shape](#response-shape)
- [Error Handling](#error-handling)
- [Test Pattern](#test-pattern)

## Installation

```sh
npm install @steamory-agent-kit/gum
```

The SDK is for Node.js backend code. It requires Node.js 18 or newer and supports ESM and CommonJS consumers.

## Client Setup

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const apiKey = process.env.GUM_API_KEY;

if (!apiKey) {
  throw new Error("Missing GUM_API_KEY");
}

export const gum = new GumClient({
  apiKey,
});
```

Full configuration:

```ts
const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
  host: "gum.asix.inc",
  timeoutMs: 30_000,
  fetch: globalThis.fetch,
});
```

Options:

| Option | Default | Use |
| --- | --- | --- |
| `apiKey` | Required | Gum API key. The SDK sends `Authorization: Api-Key <apiKey>`. A value that already starts with `Api-Key ` is accepted. |
| `host` | `gum.asix.inc` | Gum service host. Plain hosts are normalized to HTTPS. Explicit `http://` or `https://` URLs are preserved. |
| `timeoutMs` | `30000` | Default timeout in milliseconds. Use `0` to disable the SDK timeout. |
| `fetch` | `globalThis.fetch` | Fetch-compatible implementation for tests, proxies, or custom runtimes. |

Do not expose `GUM_API_KEY` in browser-side code. Add backend endpoints if frontend code needs to trigger Gum writes.

When an agent is integrating Gum and cannot find `GUM_API_KEY` in the project setup, it should prompt the user to fill it in. Do not invent or hard-code a real key. Use a placeholder in documentation or env examples:

```sh
GUM_API_KEY=your_gum_api_key_here
```

Keep the runtime check in application code so misconfigured deployments fail with a clear error.

## Sessions

Create a Session for a new conversation:

```ts
const session = await gum.sessions.create({
  user_id: "user_123",
  title: "Support session",
  metadata: {
    source: "node",
    locale: "en-US",
  },
});

console.log(session.id);
console.log(session.rawResponse);
```

`user_id` is required. Store `session.id` if the application needs to continue the same Gum Session later.

Restore a local Session object when the id is already stored:

```ts
const session = gum.sessions.fromId("session_123");
```

`fromId()` does not make a network request. It only recreates the object-style API.

## Messages

Add one message:

```ts
await session.addMessage({
  role: "user",
  content: "I want to check my order",
});
```

Add multiple messages:

```ts
await session.addMessages([
  {
    role: "user",
    content: "Hello",
  },
  {
    role: "assistant",
    content: "Hi, how can I help?",
  },
]);
```

Use the lower-level resource API when only the Session id is available:

```ts
await gum.sessions.addMessages("session_123", {
  messages: [
    {
      role: "user",
      content: "Continue the previous topic",
      metadata: {
        channel: "chat",
      },
    },
  ],
});
```

Message fields:

```ts
type ProcessingStatus = "pending" | "chunked" | "processed" | "failed";

interface Message {
  id?: string | null;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: string | Date | null;
  created_at?: string | Date | null;
  status?: ProcessingStatus;
}
```

The SDK serializes `Date` values to ISO strings and removes `undefined` values from request bodies.

## Context Recall

Retrieve context with query parameters:

```ts
const context = await session.getContext({
  query: "order preferences",
  details: true,
});

console.log(context.data);
```

Use resource API form when only the Session id is available:

```ts
const context = await gum.sessions.getContext("session_123", {
  query: "preferences",
  details: true,
});
```

When `recall_config` is omitted, the SDK calls the GET context endpoint. When `recall_config` is present, the SDK calls the POST context endpoint and sends the config in the JSON body.

```ts
const context = await session.getContext({
  query: "order preferences",
  details: true,
  recall_config: {
    message_recent_limit: 20,
    message_semantic_top_k: 8,
    message_semantic_min_score: 0.4,
    query_router: "single_hop_parallel",
    enable_long_term_recall: false,
  },
});
```

Common `recall_config` fields:

```ts
interface RecallConfig {
  message_recent_limit?: number;
  message_semantic_top_k?: number;
  message_semantic_min_score?: number;
  query_router?: "single_hop_direct" | "single_hop_parallel" | "multi_hop_chain" | null;
  observation_recent_limit?: number;
  observation_semantic_top_k?: number;
  observation_semantic_min_score?: number;
  proposition_top_k?: number;
  topic_top_k?: number;
  observation_context_top_k?: number;
  long_term_rrf_k?: number;
  enable_long_term_rerank?: boolean;
  enable_long_term_recall?: boolean;
}
```

## User Actions

Create user action logs for product events that should be remembered or searched later:

```ts
await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "User clicked the refund button on the order detail page",
  session_id: session.id,
  event_type: "click",
  page: "order_detail",
  anchors: {
    order_id: "order_123",
  },
  metadata: {
    source: "backend",
  },
});
```

Request shape:

```ts
type AnchorSet = Record<string, string>;

interface ActionLogInput {
  log_id?: string | null;
  user_id: string;
  timestamp: string | Date;
  content: string;
  session_id?: string | null;
  device_id?: string | null;
  app?: string | null;
  platform?: string | null;
  event_type?: string | null;
  page?: string | null;
  anchors?: AnchorSet | null;
  metadata?: Record<string, unknown> | null;
  entities?: string[] | null;
}
```

Prefer `content` like `User searched for nearby restaurants` or `User clicked the refund button on the order detail page`. Avoid content like `click` because it is weak retrieval text.

## Request Options

Every SDK method accepts optional request options as the last argument:

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

Use per-request `timeoutMs` for tighter request budgets. Use `headers` for request ids or backend tracing metadata.

## Response Shape

Most resource methods return the Gum response envelope:

```ts
interface GumEnvelope<T = unknown> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: unknown;
  [key: string]: unknown;
}
```

`gum.sessions.create()` returns a `Session` object, not the envelope directly. Read the created Session id from `session.id` and the original create response from `session.rawResponse`.

## Error Handling

```ts
import {
  GumApiError,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum";

try {
  const session = await gum.sessions.create({
    user_id: "user_123",
    title: "Demo session",
  });

  await session.addMessage({
    role: "user",
    content: "Hello",
  });
} catch (error) {
  if (error instanceof GumApiError) {
    console.error("Gum API returned an error", {
      status: error.status,
      statusText: error.statusText,
      detail: error.detail,
      body: error.body,
    });
  } else if (error instanceof GumTimeoutError) {
    console.error(`Gum API request timed out after ${error.timeoutMs}ms`, error.cause);
  } else if (error instanceof GumConnectionError) {
    console.error("Gum API network or fetch failure", error.cause);
  } else {
    throw error;
  }
}
```

Error classes:

| Error | Meaning |
| --- | --- |
| `GumApiError` | Gum returned a non-2xx response. Includes `status`, `statusText`, `headers`, `body`, and `detail`. |
| `GumConnectionError` | The underlying fetch request failed before a response was received. |
| `GumTimeoutError` | The request was aborted by timeout or an `AbortSignal`. Extends `GumConnectionError`. |

## Test Pattern

Use custom `fetch` in tests instead of calling the real Gum service:

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const fetch = async () =>
  new Response(JSON.stringify({ data: { session_id: "session_123" } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const gum = new GumClient({
  apiKey: "test-key",
  fetch,
});

const session = await gum.sessions.create({
  user_id: "user_123",
});
```

Assert the URL, method, headers, JSON body, and error branch that the application depends on.

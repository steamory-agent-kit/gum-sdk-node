<h1 align="center">@steamory-agent-kit/gum</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@steamory-agent-kit/gum"><img alt="npm version" src="https://img.shields.io/npm/v/@steamory-agent-kit/gum.svg"></a>
  <a href="#license"><img alt="license" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <a href="https://nodejs.org/"><img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg"></a>
</p>

<p align="center">
  TypeScript-first Node.js SDK for the Gum API. Use it to create conversation Sessions,
  append messages, retrieve contextual memory, and write user action events from Node.js
  applications.
</p>

---

## Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Runtime Contracts](#runtime-contracts)
- [Project](#project)

## Features

- Fully typed TypeScript API.
- ESM and CommonJS builds.
- Works on Node.js 18+ with the built-in Fetch API.
- Optional custom `fetch` implementation for tests, proxies, and custom runtimes.
- Automatic `Date` serialization and undefined-value cleanup for request bodies.
- Request timeout support with typed API errors, connection errors, and timeout errors.

---

## Getting Started

### Installation

```sh
# Install the SDK from npm.
npm install @steamory-agent-kit/gum
```

### Quick Start

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
});

const session = await gum.sessions.create({
  user_id: "user_123",
  title: "Team scheduling session",
});

await session.addMessages([
  {
    role: "user",
    content:
      "I'm setting up regular check-ins for our Europe team. Let's use Berlin as the city for that group.",
  },
  {
    role: "assistant",
    content:
      "Got it. I will use Berlin when you mention the Europe team.",
  },
  {
    role: "user",
    content:
      "For the Americas team, Toronto is usually the city I want to use.",
  },
]);

const memory = await session.getMemory({
  query: "which city should be used for Europe or Americas team scheduling",
});

console.log(memory.data);
```

## Show Demo: Team Scheduling Assistant

This example shows a realistic turn lifecycle for an AI scheduling assistant:
retrieve memory before calling your model, then write the new conversation back
after the reply. The user does not need to repeat that Europe team scheduling
usually uses Berlin, while Americas team scheduling usually uses Toronto.

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
});

type AssistantTurnInput = {
  userId: string;
  sessionId?: string;
  userContent: string;
};

async function schedulingAssistantTurn({
  userId,
  sessionId,
  userContent,
}: AssistantTurnInput) {
  const session = sessionId
    ? gum.sessions.fromId(sessionId)
    : await gum.sessions.create({
        user_id: userId,
        title: "Team scheduling session",
        metadata: {
          source: "assistant-api",
          channel: "web-chat",
        },
      });

  // 1. Retrieve relevant memory before calling your model.
  const memory = await session.getMemory({
    query: userContent,
    details: true,
    recall_config: {
      message_recent_limit: 12,
      message_semantic_top_k: 6,
      query_router: "single_hop_parallel",
    },
  });

  const assistantReply = await callYourLLM({
    userContent,
    memoryContext: JSON.stringify(memory.data ?? {}),
  });

  // 2. Save the new turn after generating the reply.
  // Run this in the background if your product needs the fastest response path.
  void session.addMessages([
    { role: "user", content: userContent },
    { role: "assistant", content: assistantReply },
  ]).catch((error) => {
    console.error("Gum memory write failed", error);
  });

  return {
    sessionId: session.id,
    assistantReply,
  };
}

async function callYourLLM(input: {
  userContent: string;
  memoryContext: string;
}): Promise<string> {
  // Replace this with OpenAI, Anthropic, Gemini, or your internal model call.
  return [
    "I will use the saved scheduling context before answering.",
    `Memory context: ${input.memoryContext}`,
    `User message: ${input.userContent}`,
  ].join("\n");
}
```

Example flow:

```ts
const firstTurn = await schedulingAssistantTurn({
  userId: "user_123",
  userContent:
    "For recurring team check-ins, use Berlin when I mention Europe and Toronto when I mention the Americas.",
});

const nextTurn = await schedulingAssistantTurn({
  userId: "user_123",
  sessionId: firstTurn.sessionId,
  userContent: "Can you schedule the next sync for the region we discussed?",
});
```

### Configuration

```ts
import { GumClient } from "@steamory-agent-kit/gum";

// Configure the client host and default timeout.
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

---

## API Reference

### Client

#### `new GumClient(options)`

Creates a client instance. The client exposes resource groups under
`gum.sessions` and `gum.userActions`.

```ts
// Create a Gum client with the required API key.
const gum = new GumClient({
  apiKey: "gum_api_key",
});
```

#### `gum.health(options?)`

Checks the Gum service health endpoint.

```ts
// Check the Gum service health endpoint.
const health = await gum.health();
```

### Sessions

#### `gum.sessions.create(input, options?)`

Creates a Session and returns a `Session` object. The object exposes the
created Session id and convenience methods that automatically use that id.
`input.user_id` is required by the Gum API.

```ts
// Create a Session and inspect the returned helper.
const session = await gum.sessions.create({
  user_id: "user_123",
  title: "Team scheduling session",
  metadata: {
    source: "assistant-api",
    channel: "web-chat",
  },
});

console.log(session.id);
console.log(session.rawResponse);
```

If Gum returns a successful response without `data.session_id`, the SDK throws
`Error: Gum API did not return data.session_id`.

#### `gum.sessions.fromId(sessionId)`

Creates a local `Session` object from an existing Session id without making a
network request. Use this when the Session id is already stored in your
application and you want the object-style API again.

```ts
// Rebuild a Session helper from an existing Session id.
const session = gum.sessions.fromId("session_123");

await session.addMessage({
  role: "user",
  content: "Continue where we left off. If I mention a region, use the city we picked for that team.",
});

const memory = await session.getMemory({
  query: "which city should be used for the user's team scheduling request",
});
```

#### `session.addMessage(message, options?)`

Adds one message to the created Session.

```ts
// Append one message to the Session.
await session.addMessage({
  role: "user",
  content:
    "For the Americas team, I usually coordinate from Toronto.",
});
```

#### `session.addMessages(input, options?)`

Adds messages to the created Session. `input` can be either a direct message
array or an object with a `messages` property.

```ts
// Append messages with the array shorthand.
await session.addMessages([
  {
    role: "user",
    content:
      "For the Europe team check-in, keep Berlin as the city we are working from.",
  },
  {
    role: "assistant",
    content:
      "Understood. I will use Berlin for Europe team scheduling and Toronto for the Americas team.",
  },
]);

// Append messages with the object form.
await session.addMessages({
  messages: [
    {
      role: "user",
      content:
        "That works for me: Berlin when I mention Europe, and Toronto when I mention the Americas.",
      metadata: {
        channel: "chat",
      },
    },
  ],
});
```

### `session.getMemory(params?, options?)`

Retrieves memory for the created Session. Pass `query` to focus the retrieval
and `details` to include detailed memory data when the API supports it.

```ts
const memory = await session.getMemory({
  query: "which city should be used for Europe or Americas team scheduling",
  details: true,
});
```

Pass `recall_config` to override memory recall behavior. When
`recall_config` is present, the SDK uses the POST context endpoint so the
configuration can be sent as a JSON body.

```ts
const memory = await session.getMemory({
  query: "which city should be used for the user's team scheduling request",
  details: true,
  recall_config: {
    message_recent_limit: 20,
    message_semantic_top_k: 8,
    query_router: "single_hop_parallel",
    enable_long_term_recall: false,
  },
});
```

#### `gum.sessions.addMessages(sessionId, input, options?)`

Lower-level API for adding messages when you already have a Session id.
`input` can be either a direct message array or an object with a `messages`
property.

```ts
// Append messages by Session id with the array shorthand.
await gum.sessions.addMessages("session_123", [
  {
    role: "user",
    content:
      "Use the Europe city we discussed and draft the agenda for the next team check-in.",
  },
  {
    role: "assistant",
    content:
      "I will use Berlin for that check-in and keep the agenda focused on project updates.",
  },
]);

// Append messages by Session id with the object form.
await gum.sessions.addMessages("session_123", {
  messages: [
    {
      role: "user",
      content:
        "That works for me: Berlin when I mention Europe, and Toronto when I mention the Americas.",
      metadata: {
        channel: "chat",
      },
    },
  ],
});
```

### `gum.sessions.getMemory(sessionId, params?, options?)`

Lower-level API for retrieving memory when you already have a Session id. Pass
`query` to focus the retrieval and `details` to include detailed memory data
when the API supports it.

```ts
const memory = await gum.sessions.getMemory("session_123", {
  query: "which city should be used for Europe or Americas team scheduling",
  details: true,
});
```

As with `session.getMemory`, this lower-level method automatically uses the
POST context endpoint when `recall_config` is present.

### User Actions

#### `gum.userActions.create(input, options?)`

Creates one user action log.

```ts
// Write a user action event with optional anchors and metadata.
await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "User opened the Europe team scheduling page",
  session_id: "session_123",
  event_type: "page_view",
  page: "team_scheduling",
  anchors: {
    region: "Europe",
    city: "Berlin",
  },
  metadata: {
    source: "assistant-api",
  },
});
```

---

## Runtime Contracts

### Request Options

Every SDK method accepts optional request options as its last argument.

```ts
// Override timeout, abort signal, and headers for one request.
const controller = new AbortController();

await gum.sessions.getMemory(
  "session_123",
  { query: "which city should be used for the user's team scheduling request" },
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

### Response Shape

Resource methods return the Gum response envelope:

```ts
// Resource methods return this generic Gum response envelope.
type GumEnvelope<T = unknown> = {
  data?: T;
  success?: boolean;
  message?: string;
  error?: unknown;
  [key: string]: unknown;
};
```

For example, `gum.sessions.create()` returns
`Promise<Session>`. The created Session id is available as `session.id`, and
the original create response envelope is available as `session.rawResponse`.
This is a breaking change from earlier 0.x versions where
`gum.sessions.create()` returned `Promise<GumEnvelope<CreateSessionResponse>>`.
`gum.sessions.fromId(sessionId)` also returns a `Session`, using a synthetic
`rawResponse` shaped as `{ data: { session_id: sessionId } }`.

### Error Handling

```ts
import {
  GumApiError,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum";

// Handle SDK error types explicitly.
try {
  await gum.sessions.create({ user_id: "user_123", title: "Team scheduling session" });
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

### TypeScript

The package ships generated type declarations. Public types are exported from
the package root:

```ts
// Import public SDK TypeScript types from the package root.
import type {
  ActionLogInput,
  GumClientOptions,
  Message,
  RecallConfig,
  Session,
  SessionMemory,
} from "@steamory-agent-kit/gum";
```

Session public types use the same naming as the `gum.sessions` resource group.

---

## Project

### Development

```sh
# Install dependencies, verify types, run tests, and build the package.
npm install
npm run typecheck
npm test
npm run test:coverage
npm run build
```

### Publishing

The repository includes a `.gitlab-ci.yml` pipeline for verifying, building, and
publishing this SDK to npm.

GitLab requirements:

- Add a masked and protected CI/CD variable named `NPM_TOKEN`.
- `NPM_TOKEN` must contain an npm granular access token with publish permission for
  `@steamory-agent-kit/gum`.
- If the npm account or package requires 2FA for publishing, create the token
  with bypass 2FA enabled. Otherwise the publish job will fail with `EOTP`.
- For a one-off manual publish with a non-bypass token, run the `publish` job
  manually and add a temporary `NPM_OTP` variable containing the current
  authenticator code.

Pipeline flow:

```sh
# Verify and publish the package from CI.
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

### Contributing

Issues and pull requests are welcome. For code changes, please run the local
checks before opening a pull request:

```sh
# Run the core local checks before opening a pull request.
npm run typecheck
npm test
npm run build
```

### License

MIT

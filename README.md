# @steamory-agent-kit/gum-sdk

Node.js SDK for the Gum service.

## Installation

```sh
npm install @steamory-agent-kit/gum-sdk
```

## Usage

```ts
import { GumClient } from "@steamory-agent-kit/gum-sdk";

const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
});

const thread = await gum.threads.create({
  title: "demo",
});

await gum.threads.addMessages("thread_123", [
  {
    role: "user",
    content: "我想查一下订单",
  },
]);

const context = await gum.threads.getContext("thread_123", {
  query: "订单",
  details: true,
});

await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "用户点击了订单详情",
  event_type: "click",
  page: "order_detail",
});
```

## Configuration

```ts
const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
  timeoutMs: 30_000,
});
```

Options:

- `apiKey`: Gum API key. The SDK sends it as `Authorization: Api-Key <apiKey>`.
- `host`: optional Gum service host override. Defaults to `gum.asix.inc`, so most integrations do not need to set it. Pure host values are sent over HTTPS, so `gum.asix.inc` becomes `https://gum.asix.inc`.
- `timeoutMs`: request timeout in milliseconds. Defaults to `30000`.
- `fetch`: optional custom fetch implementation for tests, proxies, or custom runtimes.

## API

### `gum.threads.create(input?)`

Creates a thread.

```ts
await gum.threads.create({
  title: "demo",
  metadata: { source: "node" },
});
```

### `gum.threads.addMessages(threadId, input)`

Adds messages to a thread. `input` can be either `{ messages }` or a direct message array.

```ts
await gum.threads.addMessages("thread_123", [
  { role: "user", content: "hello" },
  { role: "assistant", content: "hi" },
]);
```

### `gum.threads.getContext(threadId, params?)`

Gets memory context for a thread.

```ts
await gum.threads.getContext("thread_123", {
  query: "hello",
  details: true,
});
```

### `gum.userActions.create(input)`

Creates one user action log.

```ts
await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "用户搜索了附近餐厅",
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

## Errors

```ts
import { GumApiError, GumTimeoutError } from "@steamory-agent-kit/gum-sdk";

try {
  await gum.threads.create({ title: "demo" });
} catch (error) {
  if (error instanceof GumApiError) {
    console.error(error.status, error.detail, error.body);
  }

  if (error instanceof GumTimeoutError) {
    console.error(error.timeoutMs);
  }
}
```

## Development

```sh
npm install
npm run typecheck
npm test
npm run test:coverage
npm run build
```

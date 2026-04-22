# Gum Node.js SDK 用户使用手册

本文档面向在 Node.js 服务端项目中接入 `@steamory-agent-kit/gum` 的开发者，基于当前 SDK 版本 `0.1.1` 编写。

SDK 提供 TypeScript 优先的 Gum API 访问能力，可用于创建会话、写入对话消息、获取会话上下文，以及记录用户行为事件。

## 目录

- [适用场景](#适用场景)
- [运行环境](#运行环境)
- [安装](#安装)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [初始化客户端](#初始化客户端)
- [Session 会话用法](#session-会话用法)
- [用户行为事件用法](#用户行为事件用法)
- [请求选项](#请求选项)
- [响应结构](#响应结构)
- [错误处理](#错误处理)
- [TypeScript 类型](#typescript-类型)
- [常见接入模式](#常见接入模式)
- [调试与排查](#调试与排查)
- [本地开发命令](#本地开发命令)

## 适用场景

你可以在以下场景中使用该 SDK：

- 在后端服务中为用户创建 Gum Session。
- 将用户和助手之间的对话消息追加到已有 Session。
- 基于当前 Session 查询上下文记忆。
- 将用户在产品中的点击、搜索、浏览等行为写入 Gum。
- 在 Node.js 应用中以类型安全的方式调用 Gum API。

该 SDK 是 Node.js SDK，不是前端浏览器 SDK。建议在服务端保存和使用 Gum API Key，避免把密钥暴露给浏览器、移动端或客户端应用。

## 运行环境

SDK 要求：

- Node.js `>= 18`
- 支持 ESM 或 CommonJS 的 Node.js 项目
- 可访问 Gum 服务的网络环境
- 一个有效的 Gum API Key

Node.js 18+ 内置 `fetch`，SDK 默认使用 `globalThis.fetch`。如果运行环境没有全局 `fetch`，或你需要代理、测试替身、特殊运行时，可以在初始化时传入自定义 `fetch`。

## 安装

```sh
npm install @steamory-agent-kit/gum
```

## 快速开始

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const apiKey = process.env.GUM_API_KEY;

if (!apiKey) {
  throw new Error("Missing GUM_API_KEY");
}

const gum = new GumClient({ apiKey });

const session = await gum.sessions.create({
  user_id: "user_123",
  title: "客服会话",
  metadata: {
    source: "node",
  },
});

await session.addMessage({
  role: "user",
  content: "我想查询订单状态",
});

await session.addMessage({
  role: "assistant",
  content: "可以，请提供订单号。",
});

const context = await session.getContext({
  query: "订单",
  details: true,
});

await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "用户点击订单详情页",
  event_type: "click",
  page: "order_detail",
  session_id: session.id,
});

console.log(session.id);
console.log(context.data);
```

## 核心概念

### GumClient

`GumClient` 是 SDK 的入口。实例化后可通过以下资源组访问 Gum API：

- `gum.sessions`：管理 Session 和 Session 消息、上下文。
- `gum.userActions`：写入用户行为事件。
- `gum.health()`：检查服务健康状态。

### Session

`Session` 表示一个 Gum 会话。通过 `gum.sessions.create()` 创建后会返回一个 `Session` 对象。该对象包含：

- `session.id`：当前会话 ID。
- `session.rawResponse`：创建 Session 时 Gum API 返回的原始响应包。
- `session.addMessage()`：追加单条消息。
- `session.addMessages()`：批量追加消息。
- `session.getContext()`：获取当前 Session 的上下文。

如果你已经在业务数据库中保存了 Session ID，可以用 `gum.sessions.fromId(sessionId)` 恢复一个本地 `Session` 对象。该方法不会发起网络请求。

### User Action

User Action 用来记录用户在产品中的行为，例如点击按钮、搜索、访问页面、打开订单详情等。它可以附带 `session_id`、页面、事件类型、锚点、元数据等信息。

## 初始化客户端

### 基础初始化

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
});
```

### 完整配置

```ts
const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
  host: "gum.asix.inc",
  timeoutMs: 30_000,
  fetch: globalThis.fetch,
});
```

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `apiKey` | `string` | 必填 | Gum API Key。SDK 会以 `Authorization: Api-Key <apiKey>` 形式发送。 |
| `host` | `string` | `gum.asix.inc` | Gum 服务地址。普通 host 会自动补全为 HTTPS，例如 `gum.asix.inc` 会变成 `https://gum.asix.inc`。 |
| `timeoutMs` | `number` | `30000` | 默认请求超时时间，单位毫秒。传 `0` 可禁用 SDK 内部超时。 |
| `fetch` | `FetchLike` | `globalThis.fetch` | 自定义 Fetch 兼容实现，常用于测试、代理或特殊运行时。 |

### API Key 规则

```ts
new GumClient({ apiKey: "test-key" });
new GumClient({ apiKey: "Api-Key test-key" });
```

以上两种写法都会发送：

```txt
Authorization: Api-Key test-key
```

SDK 会自动处理 `Api-Key ` 前缀，不会重复添加。

如果 `apiKey` 为空字符串或全是空格，初始化会抛出：

```txt
apiKey must not be empty
```

### Host 规则

```ts
new GumClient({ apiKey, host: "gum.example.com/" });
// 实际请求地址前缀: https://gum.example.com

new GumClient({ apiKey, host: "http://127.0.0.1:8000/" });
// 实际请求地址前缀: http://127.0.0.1:8000
```

SDK 会：

- 去除 `host` 首尾空格。
- 如果未显式写 `http://` 或 `https://`，自动加 `https://`。
- 去除末尾多余 `/`。
- 保留显式传入的 `http://` 或 `https://`。

如果 `host` 为空字符串或全是空格，初始化会抛出：

```txt
host must not be empty
```

## Session 会话用法

### 创建 Session

```ts
const session = await gum.sessions.create({
  user_id: "user_123",
  title: "售后咨询",
  metadata: {
    channel: "web",
    locale: "zh-CN",
  },
});

console.log(session.id);
console.log(session.rawResponse);
```

请求体类型：

```ts
interface SessionCreateRequest {
  user_id: string;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

说明：

- `user_id` 是必填字段。
- `title` 可选，适合记录会话标题。
- `metadata` 可选，适合记录渠道、业务来源、语言、租户等自定义信息。
- `gum.sessions.create()` 返回 `Session` 对象，不直接返回原始 envelope。
- 原始创建响应可通过 `session.rawResponse` 读取。

如果 Gum API 成功返回，但响应里没有 `data.session_id`，SDK 会抛出：

```txt
Gum API did not return data.session_id
```

### 从已有 Session ID 恢复对象

当你已经把 Session ID 存在数据库或缓存中时，可以这样恢复对象式 API：

```ts
const session = gum.sessions.fromId("session_123");

await session.addMessage({
  role: "user",
  content: "继续之前的话题",
});
```

`fromId()` 不会向 Gum API 发请求，只创建本地对象。它的 `rawResponse` 是 SDK 构造的：

```ts
{
  data: {
    session_id: "session_123",
  },
}
```

### 添加单条消息

```ts
await session.addMessage({
  role: "user",
  content: "我想修改收货地址",
});
```

消息类型：

```ts
interface Message {
  id?: string | null;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: string | Date | null;
  created_at?: string | Date | null;
  status?: "pending" | "chunked" | "processed" | "failed";
}
```

说明：

- `role` 和 `content` 必填。
- `role` 通常可使用 `"user"`、`"assistant"`、`"system"` 等业务约定值，SDK 不限制具体字符串。
- `timestamp` 和 `created_at` 可传 `Date` 或 ISO 字符串。
- 请求体中的 `Date` 会自动转换为 ISO 字符串。
- 请求体中的 `undefined` 字段会被自动移除。

### 批量添加消息

你可以直接传消息数组：

```ts
await session.addMessages([
  {
    role: "user",
    content: "你好",
  },
  {
    role: "assistant",
    content: "你好，请问有什么可以帮你？",
  },
]);
```

也可以传完整请求对象：

```ts
await session.addMessages({
  user_id: "user_123",
  messages: [
    {
      role: "user",
      content: "请记住我喜欢简洁的回答",
      metadata: {
        channel: "chat",
      },
    },
  ],
});
```

完整请求对象类型：

```ts
interface AddMessagesRequest {
  user_id?: string | null;
  messages: Message[];
}
```

### 通过资源方法添加消息

如果你只想使用底层资源 API，不想先创建或恢复 `Session` 对象：

```ts
await gum.sessions.addMessages("session_123", [
  {
    role: "user",
    content: "直接通过 session id 添加消息",
  },
]);
```

等价于：

```ts
await gum.sessions.addMessages("session_123", {
  messages: [
    {
      role: "user",
      content: "直接通过 session id 添加消息",
    },
  ],
});
```

### 获取 Session 上下文

```ts
const context = await session.getContext({
  query: "订单状态",
  details: true,
});

console.log(context.data);
```

参数类型：

```ts
interface GetSessionContextParams {
  query?: string;
  details?: boolean;
  recall_config?: RecallConfig | null;
}
```

说明：

- `query` 可选，用于聚焦上下文检索。
- `details` 可选，用于请求更详细的上下文数据，具体返回取决于 Gum API 支持情况。
- 不传 `recall_config` 时，SDK 使用 `GET /api/sessions/{sessionId}/context`。
- 传入 `recall_config` 时，SDK 使用 `POST /api/sessions/{sessionId}/context`，并把配置放入 JSON body。

### 使用 recall_config 调整上下文召回

```ts
const context = await session.getContext({
  query: "用户订单偏好",
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

`RecallConfig` 支持字段：

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

常用建议：

- 想优先使用最近对话：调高 `message_recent_limit`。
- 想增强语义召回：设置 `message_semantic_top_k`。
- 想关闭长期召回：设置 `enable_long_term_recall: false`。
- 想使用多跳查询：设置 `query_router: "multi_hop_chain"`。

### 通过资源方法获取上下文

```ts
const context = await gum.sessions.getContext("session_123", {
  query: "偏好",
  details: true,
});
```

如果不传参数：

```ts
const context = await gum.sessions.getContext("session_123");
```

SDK 会请求：

```txt
GET /api/sessions/session_123/context
```

## 用户行为事件用法

### 创建用户行为事件

```ts
await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "用户点击了订单详情页",
  session_id: "session_123",
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

请求类型：

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

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `user_id` | 是 | 用户 ID，应与业务系统中的用户标识保持一致。 |
| `timestamp` | 是 | 行为发生时间，可传 `Date` 或 ISO 字符串。 |
| `content` | 是 | 行为内容描述，建议写成可读的自然语言。 |
| `session_id` | 否 | 如果行为与某个 Gum Session 相关，建议传入。 |
| `device_id` | 否 | 设备 ID。 |
| `app` | 否 | 应用名称或应用标识。 |
| `platform` | 否 | 平台，例如 `web`、`ios`、`android`、`server`。 |
| `event_type` | 否 | 事件类型，例如 `click`、`search`、`view`。 |
| `page` | 否 | 页面或业务位置。 |
| `anchors` | 否 | 业务锚点，例如订单 ID、商品 ID、项目 ID。 |
| `metadata` | 否 | 自定义扩展信息。 |
| `entities` | 否 | 与行为相关的实体列表。 |

### 推荐的 content 写法

`content` 建议写成清晰、可检索的中文或英文句子：

```ts
await gum.userActions.create({
  user_id: "user_123",
  timestamp: new Date(),
  content: "用户在订单详情页点击了申请退款按钮",
  event_type: "click",
  page: "order_detail",
  anchors: {
    order_id: "order_123",
  },
});
```

不建议只写非常短且缺少语义的内容：

```ts
content: "click";
```

## 请求选项

每个 SDK 方法的最后一个参数都可以传 `RequestOptions`。

```ts
const controller = new AbortController();

const context = await gum.sessions.getContext(
  "session_123",
  { query: "订单" },
  {
    timeoutMs: 5_000,
    signal: controller.signal,
    headers: {
      "X-Request-Id": "request_123",
    },
  },
);
```

类型：

```ts
interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: HeadersInit;
}
```

说明：

- `timeoutMs`：覆盖当前请求的超时时间。
- `signal`：传入外部 `AbortSignal`，用于主动取消请求。
- `headers`：添加额外请求头。

如果同时配置了客户端默认超时和单次请求超时，单次请求的 `timeoutMs` 优先生效。

```ts
const gum = new GumClient({
  apiKey,
  timeoutMs: 30_000,
});

await gum.health({
  timeoutMs: 5_000,
});
```

传 `timeoutMs: 0` 可禁用 SDK 对该请求的内部超时：

```ts
await gum.health({
  timeoutMs: 0,
});
```

## 响应结构

大多数资源方法返回 Gum API 的 envelope：

```ts
interface GumEnvelope<T = unknown> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: unknown;
  [key: string]: unknown;
}
```

示例：

```ts
const result = await session.addMessage({
  role: "user",
  content: "你好",
});

console.log(result.data);
console.log(result.success);
console.log(result.message);
```

需要注意：

- `gum.sessions.create()` 返回的是 `Session` 对象。
- 创建 Session 的原始 envelope 在 `session.rawResponse` 中。
- `gum.sessions.fromId()` 返回的 `Session` 不是 API 响应结果，而是本地对象。
- 如果 API 返回 `204 No Content` 或空响应体，SDK 会返回 `undefined`。
- 如果 API 返回非 JSON 文本，SDK 会返回字符串。

## 错误处理

SDK 导出以下错误类：

```ts
import {
  GumApiError,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum";
```

推荐写法：

```ts
try {
  await gum.sessions.create({
    user_id: "user_123",
    title: "测试会话",
  });
} catch (error) {
  if (error instanceof GumApiError) {
    console.error("Gum API 返回错误", {
      status: error.status,
      statusText: error.statusText,
      detail: error.detail,
      body: error.body,
    });
  } else if (error instanceof GumTimeoutError) {
    console.error(`Gum API 请求超时: ${error.timeoutMs}ms`, error.cause);
  } else if (error instanceof GumConnectionError) {
    console.error("Gum API 网络或 fetch 失败", error.cause);
  } else {
    throw error;
  }
}
```

### GumApiError

当 Gum API 返回非 2xx 响应时抛出。

可读取字段：

```ts
error.status;
error.statusText;
error.headers;
error.body;
error.detail;
```

如果错误响应体中包含 `detail` 字段，SDK 会把它放到 `error.detail`。当 `detail` 是字符串时，错误消息会使用该字符串；否则错误消息会使用：

```txt
Gum API request failed with status <status>
```

### GumConnectionError

当底层 `fetch` 在收到响应前失败时抛出，例如网络断开、DNS 失败、代理错误等。

可通过 `error.cause` 查看原始错误。

### GumTimeoutError

当请求因 SDK 超时或外部 `AbortSignal` 被中止时抛出。它继承自 `GumConnectionError`。

可读取：

```ts
error.timeoutMs;
error.cause;
```

## TypeScript 类型

SDK 在包根目录导出常用类型：

```ts
import type {
  ActionLog,
  ActionLogInput,
  AddMessagesRequest,
  AnchorSet,
  CreateActionResponse,
  CreateSessionResponse,
  GetSessionContextParams,
  GumClientOptions,
  GumEnvelope,
  Message,
  ProcessingStatus,
  QueryRouter,
  RecallConfig,
  RequestOptions,
  SessionContext,
  SessionCreateRequest,
} from "@steamory-agent-kit/gum";
```

常用类型别名：

```ts
type ProcessingStatus = "pending" | "chunked" | "processed" | "failed";

type QueryRouter =
  | "single_hop_direct"
  | "single_hop_parallel"
  | "multi_hop_chain";
```

`Session` 类和错误类也可以从包根目录导入：

```ts
import {
  GumClient,
  Session,
  GumApiError,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum";
```

## 常见接入模式

### 模式一：每个用户请求创建一个新 Session

适合临时会话、一次性问答、工单咨询等场景。

```ts
export async function handleSupportMessage(userId: string, message: string) {
  const session = await gum.sessions.create({
    user_id: userId,
    title: "support",
  });

  await session.addMessage({
    role: "user",
    content: message,
  });

  return session.id;
}
```

### 模式二：业务系统保存 Session ID，后续继续写入

适合长会话、多轮对话、用户跨页面继续会话等场景。

```ts
export async function appendUserMessage(sessionId: string, message: string) {
  const session = gum.sessions.fromId(sessionId);

  await session.addMessage({
    role: "user",
    content: message,
    timestamp: new Date(),
  });
}
```

### 模式三：对话消息和用户行为同时写入

适合希望 Gum 同时理解聊天内容和产品行为的场景。

```ts
export async function trackOrderDetailClick(params: {
  userId: string;
  sessionId: string;
  orderId: string;
}) {
  const session = gum.sessions.fromId(params.sessionId);

  await session.addMessage({
    role: "user",
    content: "我打开了订单详情页",
  });

  await gum.userActions.create({
    user_id: params.userId,
    session_id: params.sessionId,
    timestamp: new Date(),
    content: "用户打开订单详情页",
    event_type: "view",
    page: "order_detail",
    anchors: {
      order_id: params.orderId,
    },
  });
}
```

### 模式四：服务端封装单例客户端

建议在服务端封装一个 Gum 客户端模块，避免每个业务文件重复读取环境变量。

```ts
// gum.ts
import { GumClient } from "@steamory-agent-kit/gum";

const apiKey = process.env.GUM_API_KEY;

if (!apiKey) {
  throw new Error("Missing GUM_API_KEY");
}

export const gum = new GumClient({
  apiKey,
  timeoutMs: 30_000,
});
```

业务代码：

```ts
import { gum } from "./gum";

export async function createSession(userId: string) {
  return gum.sessions.create({
    user_id: userId,
  });
}
```

### 模式五：在测试中传入自定义 fetch

SDK 支持自定义 `fetch`，因此可以在单元测试中捕获请求或构造响应。

```ts
import { GumClient } from "@steamory-agent-kit/gum";

const fetchMock = async () =>
  new Response(
    JSON.stringify({
      data: {
        session_id: "session_123",
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );

const gum = new GumClient({
  apiKey: "test-key",
  fetch: fetchMock,
});

const session = await gum.sessions.create({
  user_id: "user_123",
});

console.log(session.id);
```

## 调试与排查

### 检查服务健康状态

```ts
const health = await gum.health();
console.log(health);
```

默认请求：

```txt
GET https://gum.asix.inc/healthz
```

### 确认请求地址

客户端实例上可以读取标准化后的 host：

```ts
console.log(gum.host);
```

### 确认超时时间

```ts
console.log(gum.timeoutMs);
```

### 常见问题

#### 1. 初始化时报 `apiKey must not be empty`

说明传入的 `apiKey` 是空字符串或全是空格。检查环境变量：

```ts
console.log(Boolean(process.env.GUM_API_KEY));
```

#### 2. 请求返回 401

通常是 API Key 无效、过期或环境变量读取错误。捕获 `GumApiError` 后查看：

```ts
if (error instanceof GumApiError) {
  console.log(error.status);
  console.log(error.detail);
  console.log(error.body);
}
```

#### 3. 请求超时

可以临时调大超时：

```ts
const gum = new GumClient({
  apiKey,
  timeoutMs: 60_000,
});
```

也可以只调整某一次请求：

```ts
await session.getContext(
  { query: "订单", details: true },
  { timeoutMs: 60_000 },
);
```

#### 4. metadata 中的字段不见了

SDK 会自动移除值为 `undefined` 的字段：

```ts
await session.addMessage({
  role: "user",
  content: "hello",
  metadata: {
    source: "web",
    optional: undefined,
  },
});
```

实际发送：

```json
{
  "messages": [
    {
      "role": "user",
      "content": "hello",
      "metadata": {
        "source": "web"
      }
    }
  ]
}
```

如果需要显式表示空值，请使用 `null`。

#### 5. Date 发送后格式变化

SDK 会把请求体中的 `Date` 转为 ISO 字符串：

```ts
new Date("2026-04-22T01:02:03.000Z");
```

会被发送为：

```txt
2026-04-22T01:02:03.000Z
```

## 本地开发命令

如果你正在维护 SDK 本身，可使用以下命令：

```sh
npm install
npm run typecheck
npm test
npm run test:coverage
npm run build
```

发布前建议至少运行：

```sh
npm run typecheck
npm test
npm run build
```

## API 速查

| API | 说明 |
| --- | --- |
| `new GumClient(options)` | 创建 SDK 客户端。 |
| `gum.health(options?)` | 检查 Gum 服务健康状态。 |
| `gum.sessions.create(input, options?)` | 创建 Session，返回 `Session` 对象。 |
| `gum.sessions.fromId(sessionId)` | 从已有 Session ID 创建本地 `Session` 对象，不发请求。 |
| `gum.sessions.addMessages(sessionId, input, options?)` | 通过 Session ID 添加消息。 |
| `gum.sessions.getContext(sessionId, params?, options?)` | 通过 Session ID 获取上下文。 |
| `session.addMessage(message, options?)` | 向当前 Session 添加单条消息。 |
| `session.addMessages(input, options?)` | 向当前 Session 批量添加消息。 |
| `session.getContext(params?, options?)` | 获取当前 Session 上下文。 |
| `gum.userActions.create(input, options?)` | 创建用户行为事件。 |

## 最小完整示例

```ts
import {
  GumApiError,
  GumClient,
  GumConnectionError,
  GumTimeoutError,
} from "@steamory-agent-kit/gum";

const gum = new GumClient({
  apiKey: process.env.GUM_API_KEY!,
});

async function main() {
  try {
    const session = await gum.sessions.create({
      user_id: "user_123",
      title: "demo",
    });

    await session.addMessages([
      {
        role: "user",
        content: "我想查询订单",
      },
      {
        role: "assistant",
        content: "可以，请告诉我订单号。",
      },
    ]);

    await gum.userActions.create({
      user_id: "user_123",
      session_id: session.id,
      timestamp: new Date(),
      content: "用户进入订单查询流程",
      event_type: "view",
      page: "order_lookup",
    });

    const context = await session.getContext({
      query: "订单查询",
      details: true,
    });

    console.log({
      sessionId: session.id,
      context: context.data,
    });
  } catch (error) {
    if (error instanceof GumApiError) {
      console.error("API error", error.status, error.detail);
      return;
    }

    if (error instanceof GumTimeoutError) {
      console.error("Timeout", error.timeoutMs, error.cause);
      return;
    }

    if (error instanceof GumConnectionError) {
      console.error("Connection error", error.cause);
      return;
    }

    throw error;
  }
}

await main();
```

# Chat App Integration Pattern

Use this when adding Gum to an existing server-side chat app such as Next.js Route Handlers, Vercel AI SDK routes, Express chat endpoints, or server actions.

## Integration Shape

1. Find the server endpoint that receives a user message and calls the model.
2. Create a small server-only Gum adapter module instead of spreading Gum calls through UI code.
3. Use the app's stable chat/conversation id as Gum `session_id`.
4. Use the authenticated user/account id as Gum `user_id`.
5. For a new chat, call `await gum.sessions.init({ user_id, session_id, title, metadata })`.
6. For an existing chat, call `await gum.sessions.init(session_id)` so the SDK restores the local `Session` without a create request.
7. Retrieve Gum memory before the model call and append a compact "Relevant user memory from Gum" block to the system prompt.
8. Append the user message after the app accepts/saves it, and append assistant messages in the stream or request finish callback.
9. Convert framework message parts to Gum text messages; do not send file parts, tool calls, binary payloads, or raw framework internals as message content.
10. Decide whether Gum is required or optional. For existing open-source chat apps, default to optional: if `GUM_API_KEY` is missing or Gum fails, log the error and keep chat working.
11. If the app creates its chat row after the LLM call, move chat creation or id reservation before the LLM call. Gum needs a stable `session_id` before memory recall.
12. If the app has many provider routes, centralize Gum helpers and pass a small `gum` context through the shared route payload; do not duplicate SDK setup in every provider file.

## Shape Detection

- **Server-routed chat**: the route already has auth, chat id, messages, and model call. Integrate Gum in that route or in a route-local adapter.
- **Late-created chat id**: the UI creates the chat record only after generation. Reserve/create the chat first, then pass its id to the server route.
- **Edge LLM route**: keep the LLM route on Edge if needed, but move Gum work to a Node.js route/server action if the SDK or environment does not bundle cleanly for Edge.
- **Browser-local/proxy chat**: do not follow this file directly; read `client-proxy-chat-integration.md`.

## Adapter Skeleton

```ts
import "server-only";

import {
  GumClient,
  type Message as GumMessage,
  type Session as GumSession,
} from "@steamory-agent-kit/gum";

let gumClient: GumClient | null = null;

function getGumClient() {
  const apiKey = process.env.GUM_API_KEY;
  if (!apiKey) return null;

  gumClient ??= new GumClient({ apiKey });
  return gumClient;
}

export async function getGumSession(input: {
  userId: string;
  chatId: string;
  title?: string | null;
  create: boolean;
}): Promise<GumSession | null> {
  const gum = getGumClient();
  if (!gum) return null;

  try {
    if (!input.create) return await gum.sessions.init(input.chatId);

    return await gum.sessions.init({
      user_id: input.userId,
      session_id: input.chatId,
      title: input.title ?? "New chat",
      metadata: { source: "chat-app" },
    });
  } catch (error) {
    console.error("Failed to initialize Gum session", error);
    return null;
  }
}

export async function appendGumMessages(
  gumSession: GumSession | null,
  messages: GumMessage[]
) {
  if (!gumSession || messages.length === 0) return;

  try {
    await gumSession.addMessages(messages);
  } catch (error) {
    console.error("Failed to append Gum messages", error);
  }
}
```

## Message Conversion

For Vercel AI SDK style messages, convert only text parts into Gum messages:

```ts
type ChatMessageLike = {
  id?: string;
  role: string;
  parts?: unknown[];
};

export function toGumMessage(message: ChatMessageLike): GumMessage | null {
  const content =
    message.parts
      ?.map((part) => {
        if (
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          part.type === "text" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim() ?? "";

  if (!content) return null;

  return {
    id: message.id,
    role: message.role,
    content,
    metadata: { source: "chat-app" },
  };
}
```

## Memory Prompt

Retrieve memory before the model call and append it to the existing system prompt:

```ts
export async function getGumMemoryPrompt(
  gumSession: GumSession | null,
  query: string
) {
  if (!gumSession || !query.trim()) return "";

  try {
    const memory = await gumSession.getMemory({ query, details: true });
    const data = memory.data;
    const context =
      typeof data === "object" &&
      data !== null &&
      "context" in data &&
      typeof data.context === "string"
        ? data.context.trim()
        : JSON.stringify(data);

    return context ? `Relevant user memory from Gum:\n${context}` : "";
  } catch (error) {
    console.error("Failed to retrieve Gum memory", error);
    return "";
  }
}

const system = [existingSystemPrompt, gumMemoryPrompt]
  .filter(Boolean)
  .join("\n\n");
```

## Route Checklist

- Initialize/restore Gum after authentication and authorization succeed.
- Use `create: !existingChat && latestUserMessage?.role === "user"`.
- Build memory query from the latest user text, not the full serialized request body.
- Append memory to the existing system prompt instead of replacing the app's prompt.
- Avoid duplicate writes: if the app already appends the user message before streaming, only append assistant messages in the finish callback.
- For first-turn memory, ensure the app has already generated or persisted the `chatId` used as Gum `session_id`.
- Run the project's package manager install, typecheck, formatter/linter, and production build after editing.

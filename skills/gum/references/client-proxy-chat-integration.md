# Client-Local and Proxy Chat Integration

Use this when a chat app keeps conversations in browser state/local storage and sends requests through generic LLM proxy routes. Examples include client-heavy Next.js chat apps where the server route does not know the app user or chat session.

## Decision Rules

1. Do not import `@steamory-agent-kit/gum` in React components, Zustand stores, browser SDK clients, or platform-specific client files.
2. Add a server-side Gum boundary, such as `/api/gum/context` and `/api/gum/messages`, or a server action.
3. Keep `GUM_API_KEY` only in server env. The browser may send a local `sessionId`, but never the Gum API key.
4. Require a server-side `user_id`. Use authenticated user id when available. If the app has no auth, ask the user to choose a server-only deployment user id such as `GUM_USER_ID`; do not silently invent one for production.
5. Use the app's persisted local session id as Gum `session_id` only when it is stable across reloads and sync.
6. Make Gum optional unless the product explicitly requires memory: missing env or Gum failures should not break normal chat in OSS integrations.

## Recommended Flow

1. Before the model call, the client asks the backend Gum context route for memory using `{ sessionId, query, create }`.
2. The backend initializes Gum with `gum.sessions.init({ user_id, session_id })` for a new local chat, or `gum.sessions.init(sessionId)` for an existing chat.
3. The client inserts returned memory as a compact system/context message before the latest user message, preserving existing system prompts.
4. After the model finishes, the client posts finalized user and assistant text to the backend Gum messages route.
5. For stronger server trust, replace the post-finish client write with a server-side stream tee/parser when the proxy owns the full model response.

## Backend Route Pattern

```ts
import { GumClient } from "@steamory-agent-kit/gum";
import { NextResponse } from "next/server";

let gumClient: GumClient | null = null;

function getGum() {
  if (!process.env.GUM_API_KEY || !process.env.GUM_USER_ID) return null;
  gumClient ??= new GumClient({ apiKey: process.env.GUM_API_KEY });
  return gumClient;
}

export async function POST(request: Request) {
  const { sessionId, query, create } = await request.json();
  const gum = getGum();
  if (!gum || !sessionId || !query) return NextResponse.json({ context: "" });

  const session = create
    ? await gum.sessions.init({
        user_id: process.env.GUM_USER_ID!,
        session_id: sessionId,
        metadata: { source: "client-proxy-chat" },
      })
    : await gum.sessions.init(sessionId);

  const memory = await session.getMemory({ query, details: true });
  return NextResponse.json({ context: memory.data?.context ?? "" });
}
```

## Common Mistakes

- Exposing `GUM_API_KEY` through `NEXT_PUBLIC_`, Vite public env, or browser config.
- Using a message id as `session_id`; message ids change per turn and cannot restore a conversation.
- Creating a new Gum session on every request instead of using `init(sessionId)` for existing chats.
- Replacing system prompts with Gum memory and losing product, tool, or safety instructions.
- Assuming an Edge proxy can always import server SDKs. If bundling fails, keep the proxy on Edge and put Gum in a separate Node.js route.

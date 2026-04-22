---
name: gum
description: "Use when AI Coding needs to integrate or modify @steamory-agent-kit/gum usage in a Node.js backend. GUM is a Memory service for agents and applications: it stores conversation messages and user actions, then retrieves contextual memory for later turns. Includes creating Gum sessions, appending conversation messages, retrieving session context or memory, writing user action events, configuring GumClient with GUM_API_KEY, host, timeout, or custom fetch, and handling Gum SDK errors. Do not use for browser-only frontend code that would expose Gum API keys."
---

# Gum SDK

GUM is used as a Memory layer for agents and applications. It helps a backend store conversation messages and user actions, then recall relevant context in later turns or workflows.

Use `@steamory-agent-kit/gum` when a Node.js backend needs Gum memory sessions, conversation message ingestion, contextual recall, or user action logging.

## Core Workflow

1. Confirm the code runs server-side on Node.js 18 or newer.
2. Install `@steamory-agent-kit/gum` if it is missing.
3. Read the Gum API key from a server-only environment variable, normally `GUM_API_KEY`; if it is absent from the project setup, prompt the user to fill it in instead of inventing a value.
4. Initialize one reusable `GumClient` with `apiKey`, and only override `host`, `timeoutMs`, or `fetch` when the project needs it.
5. Create a new Session for a new user conversation, or restore one with `gum.sessions.fromId(sessionId)` when the app already stored the Session id.
6. Append user and assistant messages to the Session.
7. Retrieve Session context before answering when memory or prior behavior should influence the response.
8. Write user actions for meaningful product behavior that should become searchable memory.
9. Handle `GumApiError`, `GumConnectionError`, and `GumTimeoutError` explicitly in backend boundaries.

## Configuration

- Keep Gum API keys out of browser, mobile, and public client bundles.
- Prefer `process.env.GUM_API_KEY`; when configuring a project, tell the user exactly where to set it if it is missing.
- Keep runtime validation in backend code so the app fails with a clear `Missing GUM_API_KEY` error if the environment is still incomplete.
- Use the default host unless the deployment explicitly provides another Gum endpoint.
- Use `timeoutMs` for backend request budgets; use per-request overrides only for special paths.
- Use custom `fetch` for tests, proxies, or nonstandard runtimes.

## Missing API Key

- Ask the user to provide or configure `GUM_API_KEY` when the current environment does not contain one.
- Do not create, guess, hard-code, or commit a real Gum API key.
- If the repo uses `.env`, `.env.local`, deployment variables, or a secrets manager, point the user to the existing convention.
- For examples, use placeholders such as `GUM_API_KEY=your_gum_api_key_here`.
- For tests, use a custom `fetch` mock with a fake key such as `test-key`.

## Sessions

- Use `gum.sessions.create({ user_id, title, metadata })` for new conversations.
- Store `session.id` in the application database when future turns must continue the same memory thread.
- Use `gum.sessions.fromId(sessionId)` to recreate the local `Session` object without a network request.
- Prefer `session.addMessage()` or `session.addMessages()` over raw `gum.request()` calls.
- Include useful `metadata` such as channel, locale, tenant, or source when it helps later retrieval.

## Context Recall

- Use `session.getContext({ query, details })` to retrieve relevant memory for the current turn.
- Pass a focused natural-language `query` instead of broad keywords when possible.
- Add `recall_config` only when the app has a clear retrieval requirement, such as increasing recent message count or disabling long-term recall.
- Remember that the SDK uses GET for context without `recall_config` and POST when `recall_config` is present.

## User Actions

- Use `gum.userActions.create()` for product behavior that should be available to Gum memory, such as clicks, searches, page views, and domain events.
- Write `content` as a readable sentence, not a terse event code.
- Include `user_id` and `timestamp`; include `session_id` when the action belongs to a conversation.
- Use `anchors` for business ids such as order id, project id, document id, or item id.

## Error Handling

- Catch `GumApiError` for non-2xx Gum responses and inspect `status`, `detail`, and `body`.
- Catch `GumTimeoutError` for timed out or aborted requests.
- Catch `GumConnectionError` for network or fetch failures.
- Do not hide Gum failures silently when the user-facing behavior depends on memory.

## Testing

- Prefer a custom `fetch` mock for unit tests.
- Do not call the real Gum service from normal unit tests.
- Assert requested URLs, methods, authorization headers, JSON body shape, timeout behavior, and error handling.

## References

For detailed request shapes, examples, and edge cases, read `references/sdk-usage.md`.

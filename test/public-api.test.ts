import { describe, expectTypeOf, it } from "vitest";
import { GumClient, Session } from "../src";
import type {
  CreateActionResponse,
  GetSessionMemoryParams,
  GumEnvelope,
  RecallConfig,
  SessionCreateRequest,
  SessionInitInput,
  UserActionRecallConfig,
  UserActionRecallRequest,
  UserActionRecallResponse,
} from "../src";

describe("public API", () => {
  it("does not expose userActions.query", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    expectTypeOf(client.userActions).not.toHaveProperty("query");
    expectTypeOf(client.userActions).toHaveProperty("recall");
  });

  it("exposes Session APIs through sessions", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    expectTypeOf(client).toHaveProperty("sessions");
    expectTypeOf(client).not.toHaveProperty("threads");
    expectTypeOf(client.sessions.init).toBeCallableWith("session_123");
    expectTypeOf(client.sessions.init).toBeCallableWith({
      user_id: "user_123",
      session_id: "session_123",
    });
    expectTypeOf(client.sessions.init).returns.resolves.toEqualTypeOf<Session>();
    expectTypeOf(client.sessions).not.toHaveProperty("create");
    expectTypeOf(client.sessions).not.toHaveProperty("fromId");
    expectTypeOf(client.sessions).toHaveProperty("getMemory");
    expectTypeOf(client.sessions).not.toHaveProperty("getContext");
    expectTypeOf<Session>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<Session>().toHaveProperty("rawResponse");
    expectTypeOf<Session>().toHaveProperty("addMessage");
    expectTypeOf<Session>().toHaveProperty("addMessages");
    expectTypeOf<Session>().toHaveProperty("getMemory");
    expectTypeOf<Session>().not.toHaveProperty("getContext");
  });

  it("matches documented request and response shapes", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    const createSessionRequest: SessionCreateRequest = {
      user_id: "user_123",
      session_id: "session_123",
    };
    const createActionResponse: CreateActionResponse = {};
    const recallConfig: RecallConfig = {
      message_recent_limit: 20,
      query_router: "single_hop_parallel",
      enable_long_term_recall: false,
    };
    const memoryParams: GetSessionMemoryParams = {
      query: "preferences",
      recall_config: recallConfig,
    };
    const userActionRecallConfig: UserActionRecallConfig = {
      topk: 10,
      metadata_filters: {
        app: "console",
      },
    };
    const userActionRecallRequest: UserActionRecallRequest = {
      user_id: "user_123",
      query: "preferences",
      recall_config: userActionRecallConfig,
    };
    const userActionRecallResponse: UserActionRecallResponse = {
      formatted_context: "User prefers concise answers.",
      items: [],
    };

    expectTypeOf(createSessionRequest.user_id).toEqualTypeOf<string>();
    expectTypeOf<SessionInitInput>().toEqualTypeOf<string | SessionCreateRequest>();
    expectTypeOf<string>().toMatchTypeOf<SessionInitInput>();
    expectTypeOf<SessionCreateRequest>().toMatchTypeOf<SessionInitInput>();
    expectTypeOf(createActionResponse).toEqualTypeOf<CreateActionResponse>();
    expectTypeOf(memoryParams.recall_config).toEqualTypeOf<RecallConfig | null | undefined>();
    expectTypeOf(userActionRecallRequest.recall_config).toEqualTypeOf<
      UserActionRecallConfig | null | undefined
    >();
    expectTypeOf(userActionRecallResponse).toEqualTypeOf<UserActionRecallResponse>();
    expectTypeOf(client.userActions.recall).toBeCallableWith(userActionRecallRequest);
    expectTypeOf(client.userActions.recall)
      .returns.resolves.toEqualTypeOf<GumEnvelope<UserActionRecallResponse>>();

    if (false) {
      // @ts-expect-error user_id is required by the current Gum API docs.
      client.sessions.init({ session_id: "session_123", title: "demo" });

      // @ts-expect-error session_id is required by the current Gum API docs.
      client.sessions.init({ user_id: "user_123", title: "demo" });

      // @ts-expect-error init requires a Session id or request body with user_id.
      client.sessions.init();

      // @ts-expect-error restoring an existing Session id does not accept request options.
      client.sessions.init("session_123", { timeoutMs: 1 });

      // @ts-expect-error create is no longer part of the public Sessions API.
      client.sessions.create({ user_id: "user_123" });

      // @ts-expect-error fromId is no longer part of the public Sessions API.
      client.sessions.fromId("session_123");

      const invalidRecallConfig: RecallConfig = {
        // @ts-expect-error query_router must match the documented enum.
        query_router: "unsupported",
      };

      void invalidRecallConfig;

      const invalidUserActionRecallConfig: UserActionRecallConfig = {
        // @ts-expect-error topk must be numeric when provided.
        topk: "10",
      };

      // @ts-expect-error user_id is required for user action recall.
      client.userActions.recall({ query: "preferences" });

      // @ts-expect-error query is required for user action recall.
      client.userActions.recall({ user_id: "user_123" });

      void invalidUserActionRecallConfig;
    }
  });
});

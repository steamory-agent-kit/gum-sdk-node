import { describe, expectTypeOf, it } from "vitest";
import { GumClient, Session } from "../src";
import type {
  CreateActionResponse,
  GetSessionContextParams,
  RecallConfig,
  SessionCreateRequest,
} from "../src";

describe("public API", () => {
  it("does not expose userActions.query", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    expectTypeOf(client.userActions).not.toHaveProperty("query");
  });

  it("exposes Session APIs through sessions", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    expectTypeOf(client).toHaveProperty("sessions");
    expectTypeOf(client).not.toHaveProperty("threads");
    expectTypeOf(client.sessions.create).returns.resolves.toEqualTypeOf<Session>();
    expectTypeOf(client.sessions.fromId).returns.toEqualTypeOf<Session>();
    expectTypeOf<Session>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<Session>().toHaveProperty("rawResponse");
    expectTypeOf<Session>().toHaveProperty("addMessage");
    expectTypeOf<Session>().toHaveProperty("addMessages");
    expectTypeOf<Session>().toHaveProperty("getContext");
  });

  it("matches documented request and response shapes", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    const createSessionRequest: SessionCreateRequest = {
      user_id: "user_123",
    };
    const createActionResponse: CreateActionResponse = {};
    const recallConfig: RecallConfig = {
      message_recent_limit: 20,
      query_router: "single_hop_parallel",
      enable_long_term_recall: false,
    };
    const contextParams: GetSessionContextParams = {
      query: "preferences",
      recall_config: recallConfig,
    };

    expectTypeOf(createSessionRequest.user_id).toEqualTypeOf<string>();
    expectTypeOf(createActionResponse).toEqualTypeOf<CreateActionResponse>();
    expectTypeOf(contextParams.recall_config).toEqualTypeOf<RecallConfig | null | undefined>();

    if (false) {
      // @ts-expect-error user_id is required by the current Gum API docs.
      client.sessions.create({ title: "demo" });

      // @ts-expect-error create requires a request body with user_id.
      client.sessions.create();

      const invalidRecallConfig: RecallConfig = {
        // @ts-expect-error query_router must match the documented enum.
        query_router: "unsupported",
      };

      void invalidRecallConfig;
    }
  });
});

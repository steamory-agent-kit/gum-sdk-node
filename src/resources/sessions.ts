import type { GumClient } from "../client";
import type {
  AddMessagesRequest,
  AddMessagesResponse,
  CreateSessionResponse,
  GetSessionContextParams,
  GumEnvelope,
  Message,
  RecallConfig,
  RequestOptions,
  SessionContext,
  SessionCreateRequest,
} from "../types";
import { buildQuery } from "../utils/query";

export class Session {
  constructor(
    private readonly sessions: SessionsResource,
    readonly id: string,
    readonly rawResponse: GumEnvelope<CreateSessionResponse>,
  ) {}

  addMessage(
    message: Message,
    options?: RequestOptions,
  ): Promise<GumEnvelope<AddMessagesResponse>> {
    return this.addMessages([message], options);
  }

  addMessages(
    input: AddMessagesRequest | Message[],
    options?: RequestOptions,
  ): Promise<GumEnvelope<AddMessagesResponse>> {
    return this.sessions.addMessages(this.id, input, options);
  }

  getContext(
    params: GetSessionContextParams = {},
    options?: RequestOptions,
  ): Promise<GumEnvelope<SessionContext>> {
    return this.sessions.getContext(this.id, params, options);
  }
}

export class SessionsResource {
  constructor(private readonly client: GumClient) {}

  fromId(sessionId: string): Session {
    return new Session(this, sessionId, { data: { session_id: sessionId } });
  }

  async create(
    input: SessionCreateRequest,
    options?: RequestOptions,
  ): Promise<Session> {
    const response = await this.client.request<GumEnvelope<CreateSessionResponse>>(
      "POST",
      "/api/sessions",
      input,
      options,
    );
    const sessionId = response.data?.session_id;

    if (!sessionId) {
      throw new Error("Gum API did not return data.session_id");
    }

    return new Session(this, sessionId, response);
  }

  addMessages(
    sessionId: string,
    input: AddMessagesRequest | Message[],
    options?: RequestOptions,
  ): Promise<GumEnvelope<AddMessagesResponse>> {
    const body = Array.isArray(input) ? { messages: input } : input;

    return this.client.request(
      "POST",
      `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
      body,
      options,
    );
  }

  getContext(
    sessionId: string,
    params: GetSessionContextParams = {},
    options?: RequestOptions,
  ): Promise<GumEnvelope<SessionContext>> {
    const { recall_config: recallConfig } = params;
    const query = buildQuery({
      query: params.query,
      details: params.details,
    });

    if (recallConfig !== undefined) {
      return this.client.request(
        "POST",
        `/api/sessions/${encodeURIComponent(sessionId)}/context${query}`,
        buildSessionContextRequest(recallConfig),
        options,
      );
    }

    return this.client.request(
      "GET",
      `/api/sessions/${encodeURIComponent(sessionId)}/context${query}`,
      undefined,
      options,
    );
  }
}

function buildSessionContextRequest(recallConfig: RecallConfig | null): {
  recall_config: RecallConfig | null;
} {
  return {
    recall_config: recallConfig,
  };
}

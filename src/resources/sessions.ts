import type { GumClient } from "../client";
import type {
  AddMessagesRequest,
  AddMessagesResponse,
  CreateSessionResponse,
  GetSessionContextParams,
  GumEnvelope,
  Message,
  RequestOptions,
  SessionContext,
  SessionCreateRequest,
} from "../types";
import { buildQuery } from "../utils/query";

export class SessionsResource {
  constructor(private readonly client: GumClient) {}

  create(
    input: SessionCreateRequest = {},
    options?: RequestOptions,
  ): Promise<GumEnvelope<CreateSessionResponse>> {
    return this.client.request("POST", "/api/threads", input, options);
  }

  addMessages(
    sessionId: string,
    input: AddMessagesRequest | Message[],
    options?: RequestOptions,
  ): Promise<GumEnvelope<AddMessagesResponse>> {
    const body = Array.isArray(input) ? { messages: input } : input;

    return this.client.request(
      "POST",
      `/api/threads/${encodeURIComponent(sessionId)}/messages`,
      body,
      options,
    );
  }

  getContext(
    sessionId: string,
    params: GetSessionContextParams = {},
    options?: RequestOptions,
  ): Promise<GumEnvelope<SessionContext>> {
    const query = buildQuery({
      query: params.query,
      details: params.details,
    });

    return this.client.request(
      "GET",
      `/api/threads/${encodeURIComponent(sessionId)}/context${query}`,
      undefined,
      options,
    );
  }
}

import type { GumClient } from "../client";
import type {
  AddMessagesRequest,
  AddMessagesResponse,
  CreateThreadResponse,
  GetThreadContextParams,
  GumEnvelope,
  Message,
  RequestOptions,
  ThreadContext,
  ThreadCreateRequest,
} from "../types";
import { buildQuery } from "../utils/query";

export class ThreadsResource {
  constructor(private readonly client: GumClient) {}

  create(
    input: ThreadCreateRequest = {},
    options?: RequestOptions,
  ): Promise<GumEnvelope<CreateThreadResponse>> {
    return this.client.request("POST", "/api/threads", input, options);
  }

  addMessages(
    threadId: string,
    input: AddMessagesRequest | Message[],
    options?: RequestOptions,
  ): Promise<GumEnvelope<AddMessagesResponse>> {
    const body = Array.isArray(input) ? { messages: input } : input;

    return this.client.request(
      "POST",
      `/api/threads/${encodeURIComponent(threadId)}/messages`,
      body,
      options,
    );
  }

  getContext(
    threadId: string,
    params: GetThreadContextParams = {},
    options?: RequestOptions,
  ): Promise<GumEnvelope<ThreadContext>> {
    const query = buildQuery({
      query: params.query,
      details: params.details,
    });

    return this.client.request(
      "GET",
      `/api/threads/${encodeURIComponent(threadId)}/context${query}`,
      undefined,
      options,
    );
  }
}

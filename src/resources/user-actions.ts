import type { GumClient } from "../client";
import type {
  ActionLogInput,
  CreateActionResponse,
  GumEnvelope,
  RequestOptions,
  UserActionRecallRequest,
  UserActionRecallResponse,
} from "../types";

export class UserActionsResource {
  constructor(private readonly client: GumClient) {}

  create(
    input: ActionLogInput,
    options?: RequestOptions,
  ): Promise<GumEnvelope<CreateActionResponse>> {
    return this.client.request("POST", "/api/user/actions", input, options);
  }

  recall(
    input: UserActionRecallRequest,
    options?: RequestOptions,
  ): Promise<GumEnvelope<UserActionRecallResponse>> {
    return this.client.request("POST", "/api/user/actions/profile/recall", input, options);
  }
}

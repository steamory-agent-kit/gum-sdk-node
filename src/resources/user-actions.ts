import type { GumClient } from "../client";
import type {
  ActionLogInput,
  CreateActionResponse,
  GumEnvelope,
  RequestOptions,
} from "../types";

export class UserActionsResource {
  constructor(private readonly client: GumClient) {}

  create(
    input: ActionLogInput,
    options?: RequestOptions,
  ): Promise<GumEnvelope<CreateActionResponse>> {
    return this.client.request("POST", "/api/user/actions", input, options);
  }
}

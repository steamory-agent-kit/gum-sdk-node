export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface GumClientOptions {
  apiKey: string;
  host?: string;
  timeoutMs?: number;
  fetch?: FetchLike;
}

export interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

export interface GumEnvelope<T = unknown> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: unknown;
  [key: string]: unknown;
}

export interface SessionCreateRequest {
  user_id: string;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type ProcessingStatus = "pending" | "chunked" | "processed" | "failed";

export interface Message {
  id?: string | null;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: string | Date | null;
  created_at?: string | Date | null;
  status?: ProcessingStatus;
}

export interface AddMessagesRequest {
  user_id?: string | null;
  messages: Message[];
}

export type QueryRouter = "single_hop_direct" | "single_hop_parallel" | "multi_hop_chain";

export interface RecallConfig {
  message_recent_limit?: number;
  message_semantic_top_k?: number;
  message_semantic_min_score?: number;
  query_router?: QueryRouter | null;
  observation_recent_limit?: number;
  observation_semantic_top_k?: number;
  observation_semantic_min_score?: number;
  proposition_top_k?: number;
  topic_top_k?: number;
  observation_context_top_k?: number;
  long_term_rrf_k?: number;
  enable_long_term_rerank?: boolean;
  enable_long_term_recall?: boolean;
}

export interface GetSessionContextParams {
  query?: string;
  details?: boolean;
  recall_config?: RecallConfig | null;
}

export interface CreateSessionResponse {
  session_id: string;
  [key: string]: unknown;
}

export interface AddMessagesResponse {
  [key: string]: unknown;
}

export interface SessionContext {
  messages?: unknown[];
  observations?: unknown[];
  propositions?: unknown[];
  [key: string]: unknown;
}

export type AnchorSet = Record<string, string>;

export interface ActionLog {
  log_id?: string | null;
  user_id: string;
  timestamp: string;
  content: string;
  session_id?: string | null;
  device_id?: string | null;
  app?: string | null;
  platform?: string | null;
  event_type?: string | null;
  page?: string | null;
  anchors?: AnchorSet | null;
  metadata?: Record<string, unknown> | null;
  entities?: string[] | null;
}

export type ActionLogInput = Omit<ActionLog, "timestamp"> & {
  timestamp: string | Date;
};

export interface CreateActionResponse {
  log_id?: string | null;
  [key: string]: unknown;
}

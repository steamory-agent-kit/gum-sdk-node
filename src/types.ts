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
  messages: Message[];
}

export interface GetSessionContextParams {
  query?: string;
  details?: boolean;
}

export interface CreateSessionResponse {
  thread_id: string;
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
  log_id: string;
  [key: string]: unknown;
}

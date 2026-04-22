export function buildQuery(params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    query.set(key, serializeQueryValue(value));
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function serializeQueryValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

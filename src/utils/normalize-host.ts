const DEFAULT_HOST = "gum.asix.inc";

export function normalizeHost(host = DEFAULT_HOST): string {
  const trimmed = host.trim();

  if (trimmed.length === 0) {
    throw new Error("host must not be empty");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export function normalizeEndpoint(value: string): string {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Endpoint must use HTTP or HTTPS");
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/+$/, "");
}

export function endpointOrigin(value: string): string {
  return `${new URL(normalizeEndpoint(value)).origin}/*`;
}

export function isLocalEndpoint(value: string): boolean {
  const host = new URL(normalizeEndpoint(value)).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" ||
    host.endsWith(".localhost") || /^10\./.test(host) ||
    /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export function joinEndpoint(base: string, path: string): string {
  return `${normalizeEndpoint(base)}${path.startsWith("/") ? path : `/${path}`}`;
}

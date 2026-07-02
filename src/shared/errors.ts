export type ErrorCode =
  | "AUTHENTICATION" | "CANCELLED" | "ENDPOINT_PERMISSION" | "LOCAL_UNAVAILABLE"
  | "MALFORMED_RESPONSE" | "MODEL_UNAVAILABLE" | "NETWORK" | "TIMEOUT"
  | "UNSUPPORTED_FORMAT" | "VALIDATION" | "UNKNOWN";

export class OpenLeetError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = "OpenLeetError";
  }
}

export function sanitizeError(error: unknown): { code: ErrorCode; message: string } {
  if (error instanceof OpenLeetError) return { code: error.code, message: clean(error.message) };
  if (error instanceof DOMException && error.name === "AbortError") return { code: "CANCELLED", message: "Analysis was cancelled." };
  return { code: "UNKNOWN", message: "OpenLeet could not complete the request. Check the provider settings and try again." };
}

function clean(message: string): string {
  return message
    .replace(/(sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]+)/gi, "[credential removed]")
    .replace(/[?&](key|api_key|token)=[^&\s]+/gi, "$1=[credential removed]")
    .slice(0, 600);
}

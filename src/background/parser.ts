import { AnalysisSchema, type Analysis } from "../shared/schemas";
import { OpenLeetError } from "../shared/errors";

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(unfenced.slice(start, end + 1)); } catch { /* controlled below */ }
    }
    throw new OpenLeetError("MALFORMED_RESPONSE", "The provider returned malformed JSON. Retry or choose a model with reliable structured output.");
  }
}

export function parseAnalysis(text: string): Analysis {
  const result = AnalysisSchema.safeParse(normalizeAnalysisObject(extractJson(text)));
  if (!result.success) {
    const issue = result.error.issues[0];
    const location = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new OpenLeetError("MALFORMED_RESPONSE", `The provider response is incomplete or unsupported: ${location}${issue?.message ?? "validation failed"}`);
  }
  return result.data;
}

function normalizeAnalysisObject(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const object = value as Record<string, unknown>;
  const nested = object.analysis;
  const source = nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : object;
  return {
    ...source,
    recommended: source.recommended ?? source.expected,
    implementation: source.implementation ?? source.implemented ?? source.actual
  };
}

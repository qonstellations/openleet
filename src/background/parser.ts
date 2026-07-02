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
  const result = AnalysisSchema.safeParse(extractJson(text));
  if (!result.success) {
    throw new OpenLeetError("MALFORMED_RESPONSE", `The provider response is incomplete or unsupported: ${result.error.issues[0]?.message ?? "validation failed"}`);
  }
  return result.data;
}

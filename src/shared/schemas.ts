import { z } from "zod";

export const ProviderTypeSchema = z.enum(["openai", "anthropic", "gemini", "custom"]);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  type: ProviderTypeSchema,
  endpoint: z.string().url().refine((v) => ["http:", "https:"].includes(new URL(v).protocol), "Endpoint must use HTTP or HTTPS"),
  model: z.string().trim().min(1).max(160),
  timeoutMs: z.number().int().min(5_000).max(180_000).default(60_000),
  keyStorage: z.enum(["session", "persistent"]).default("session")
});
export type ProviderProfile = z.infer<typeof ProfileSchema>;

export const ProblemContextSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  statement: z.string().min(20).max(100_000),
  language: z.string().min(1).max(80),
  code: z.string().min(1).max(100_000),
  reference: z.string().max(15_000).optional(),
  url: z.string().url(),
  fingerprint: z.string().min(8)
});
export type ProblemContext = z.infer<typeof ProblemContextSchema>;

const COMPLEXITY_CLASSES = [
  "constant", "logarithmic", "linear", "linearithmic", "quadratic",
  "cubic", "polynomial", "exponential", "factorial", "multiple_variables",
  "amortized", "average_case", "output_sensitive", "unusual", "uncertain"
] as const;

export function normalizeComplexityClass(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const exact = COMPLEXITY_CLASSES.find((item) => item === normalized);
  if (exact) return exact;

  const unwrapped = normalized.replace(/^[^a-z]+|[^a-z_]+$/gu, "");
  const canonical = COMPLEXITY_CLASSES.find((item) => {
    const start = unwrapped.indexOf(item);
    if (start < 0) return false;
    const before = unwrapped[start - 1];
    const after = unwrapped[start + item.length];
    return (!before || !/[a-z]/u.test(before)) && (!after || !/[a-z]/u.test(after));
  });
  if (canonical) return canonical;

  const bigO = value.toLowerCase().replace(/\s+/gu, "");
  if (/^o?\(?1\)?[.;,}\]]*$/u.test(bigO)) return "constant";
  if (/n!|factorial/u.test(bigO)) return "factorial";
  if (/2\^n|2ⁿ|exponential/u.test(bigO)) return "exponential";
  if (/log/u.test(bigO) && /n/u.test(bigO) && !/n(?:\*|·)?log/u.test(bigO)) return "logarithmic";
  if (/n(?:\*|·)?logn|nlogn/u.test(bigO)) return "linearithmic";
  if (/n(?:\^?2|²)/u.test(bigO)) return "quadratic";
  if (/n(?:\^?3|³)/u.test(bigO)) return "cubic";
  if (/n\^[a-z0-9]+/u.test(bigO)) return "polynomial";
  if (/o?\([^)]*[a-z][+*,][^)]*[a-z][^)]*\)/u.test(bigO)) return "multiple_variables";
  if (/^o?\(?n\)?[.;,}\]]*$/u.test(bigO)) return "linear";
  return value;
}

export const ComplexityClassSchema = z.preprocess(
  normalizeComplexityClass,
  z.enum(COMPLEXITY_CLASSES)
);
export type ComplexityClass = z.infer<typeof ComplexityClassSchema>;

export const ComplexitySchema = z.object({
  display: z.string().trim().min(1).max(120),
  class: ComplexityClassSchema,
  case: z.enum(["worst", "average", "expected", "amortized", "best", "not_applicable", "uncertain"]).default("uncertain"),
  explanation: z.string().trim().max(2_000).default("")
});

export const AnalysisSchema = z.object({
  recommended: z.object({
    approach: z.string().trim().min(1).max(3_000),
    time: ComplexitySchema,
    space: ComplexitySchema
  }),
  implementation: z.object({
    approach: z.string().trim().min(1).max(3_000),
    time: ComplexitySchema,
    space: ComplexitySchema
  }),
  comparison: z.object({
    verdict: z.enum(["matches", "slower", "more_memory", "time_space_tradeoff", "different_but_valid", "uncertain"]),
    summary: z.string().trim().min(1).max(3_000),
    mostImportantDifference: z.string().trim().min(1).max(1_000)
  }).default({
    verdict: "uncertain",
    summary: "Not requested for compact analysis.",
    mostImportantDifference: "Not requested for compact analysis."
  }),
  confidence: z.enum(["high", "medium", "low"]).default("low"),
  uncertainty: z.string().trim().max(2_000).default("")
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const AnalyseRequestSchema = z.object({
  type: z.literal("ANALYSE"),
  requestId: z.string().uuid(),
  profileId: z.string().uuid(),
  context: ProblemContextSchema
});
export const CancelRequestSchema = z.object({
  type: z.literal("CANCEL"),
  requestId: z.string().uuid()
});
export const TestRequestSchema = z.object({
  type: z.literal("TEST_PROFILE"),
  profileId: z.string().uuid()
});
export const OpenOptionsRequestSchema = z.object({
  type: z.literal("OPEN_OPTIONS")
});
export const RuntimeRequestSchema = z.discriminatedUnion("type", [
  AnalyseRequestSchema, CancelRequestSchema, TestRequestSchema, OpenOptionsRequestSchema
]);
export type RuntimeRequest = z.infer<typeof RuntimeRequestSchema>;

export type RuntimeResponse =
  | { ok: true; requestId?: string; fingerprint?: string; analysis?: Analysis; message?: string }
  | { ok: false; requestId?: string; code: string; message: string };

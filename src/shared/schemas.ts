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
  url: z.string().url(),
  fingerprint: z.string().min(8)
});
export type ProblemContext = z.infer<typeof ProblemContextSchema>;

export const ComplexityClassSchema = z.enum([
  "constant", "logarithmic", "linear", "linearithmic", "quadratic",
  "cubic", "polynomial", "exponential", "factorial", "multiple_variables",
  "amortized", "average_case", "output_sensitive", "unusual", "uncertain"
]);
export type ComplexityClass = z.infer<typeof ComplexityClassSchema>;

export const ComplexitySchema = z.object({
  display: z.string().trim().min(1).max(120),
  class: ComplexityClassSchema,
  case: z.enum(["worst", "average", "expected", "amortized", "best", "not_applicable", "uncertain"]),
  explanation: z.string().trim().min(1).max(2_000)
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
  }),
  confidence: z.enum(["high", "medium", "low"]),
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
export const RuntimeRequestSchema = z.discriminatedUnion("type", [
  AnalyseRequestSchema, CancelRequestSchema, TestRequestSchema
]);
export type RuntimeRequest = z.infer<typeof RuntimeRequestSchema>;

export type RuntimeResponse =
  | { ok: true; requestId?: string; fingerprint?: string; analysis?: Analysis; message?: string }
  | { ok: false; requestId?: string; code: string; message: string };

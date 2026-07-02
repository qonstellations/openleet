import { describe, expect, it } from "vitest";
import { ComplexityClassSchema, ProfileSchema, RuntimeRequestSchema } from "../src/shared/schemas";
import { context, profile } from "./fixtures";

describe("profile validation", () => {
  it("accepts a valid provider profile", () => {
    expect(ProfileSchema.parse(profile)).toEqual(profile);
  });
  it("rejects unsafe endpoint protocols and invalid timeouts", () => {
    expect(() => ProfileSchema.parse({ ...profile, endpoint: "file:///tmp/key", timeoutMs: 1 })).toThrow();
  });
});

describe("runtime message validation", () => {
  it("accepts a complete analysis request", () => {
    expect(RuntimeRequestSchema.safeParse({ type: "ANALYSE", requestId: crypto.randomUUID(), profileId: profile.id, context }).success).toBe(true);
    expect(RuntimeRequestSchema.safeParse({ type: "OPEN_OPTIONS" }).success).toBe(true);
  });
  it("rejects messages with injected fields in context shape", () => {
    expect(RuntimeRequestSchema.safeParse({ type: "ANALYSE", requestId: "bad", profileId: profile.id, context: {} }).success).toBe(false);
  });
});

describe("complexity class normalization", () => {
  it("repairs punctuation and common Big-O values from small local models", () => {
    expect(ComplexityClassSchema.parse("constant}};")).toBe("constant");
    expect(ComplexityClassSchema.parse("O(n log n)")).toBe("linearithmic");
    expect(ComplexityClassSchema.parse("O(n²)")).toBe("quadratic");
    expect(ComplexityClassSchema.parse("O(2^n)")).toBe("exponential");
    expect(ComplexityClassSchema.parse("O(V + E)")).toBe("multiple_variables");
    expect(ComplexityClassSchema.parse("Unknown")).toBe("uncertain");
  });

  it("still rejects unsupported classifications", () => {
    expect(ComplexityClassSchema.safeParse("probably quick").success).toBe(false);
  });
});

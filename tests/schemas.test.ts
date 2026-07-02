import { describe, expect, it } from "vitest";
import { ProfileSchema, RuntimeRequestSchema } from "../src/shared/schemas";
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
  });
  it("rejects messages with injected fields in context shape", () => {
    expect(RuntimeRequestSchema.safeParse({ type: "ANALYSE", requestId: "bad", profileId: profile.id, context: {} }).success).toBe(false);
  });
});

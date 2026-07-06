import { describe, expect, it } from "vitest";
import { isResponseCurrent } from "../src/content/stale";
import { sanitizeError, OpenLeetError } from "../src/shared/errors";
import { detectPageStatus } from "../src/content/page-status";

describe("stale-response prevention", () => {
  it("requires matching request, code fingerprint, and problem", () => {
    expect(isResponseCurrent("r1", "r1", "hash", "hash", "two-sum", "two-sum")).toBe(true);
    expect(isResponseCurrent("r1", "r2", "hash", "hash", "two-sum", "two-sum")).toBe(false);
    expect(isResponseCurrent("r1", "r1", "old", "new", "two-sum", "two-sum")).toBe(false);
    expect(isResponseCurrent("r1", "r1", "hash", "hash", "two-sum", "three-sum")).toBe(false);
  });
});

describe("page eligibility", () => {
  it("supports only leetcode.com problem routes", () => {
    expect(detectPageStatus(new URL("https://leetcode.com/contest/weekly-contest-1/")).supported).toBe(false);
    expect(detectPageStatus(new URL("https://leetcode.com/assessment/test/")).supported).toBe(false);
    expect(detectPageStatus(new URL("https://example.com/problems/two-sum/")).supported).toBe(false);
    expect(detectPageStatus(new URL("http://leetcode.com/problems/two-sum/")).supported).toBe(false);
  });

  it("supports every problem route without inspecting page content", () => {
    expect(detectPageStatus(new URL("https://leetcode.com/problems/two-sum/"))).toMatchObject({ supported: true, slug: "two-sum" });
    expect(detectPageStatus(new URL("https://leetcode.com/problems/weekly-contest-problem/"))).toMatchObject({
      supported: true,
      slug: "weekly-contest-problem"
    });
  });
});

describe("error sanitization", () => {
  it("removes likely credentials from controlled provider errors", () => {
    const safe = sanitizeError(new OpenLeetError("NETWORK", "failed Bearer abcdefghijklmnop at ?api_key=secret-value"));
    expect(safe.message).not.toContain("abcdefghijklmnop");
    expect(safe.message).not.toContain("secret-value");
  });
  it("does not expose arbitrary errors", () => {
    expect(sanitizeError(new Error("sk-super-secret-token")).message).not.toContain("super-secret");
  });
});

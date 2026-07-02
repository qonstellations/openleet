import { describe, expect, it } from "vitest";
import { complexitiesMatch, containsNativeTabPair, isResultTabLabel, isSubmitLabel, isUnknownComplexity, normalizeText, shortApproach } from "../src/content/presentation";

describe("compact analysis presentation", () => {
  it("limits approach labels to three words", () => {
    expect(shortApproach("  Sort then two pointers  ")).toBe("Sort then two");
    expect(shortApproach("Hash map")).toBe("Hash map");
  });

  it("normalizes LeetCode control labels", () => {
    expect(normalizeText("  Test\n Result ")).toBe("test result");
    expect(normalizeText(null)).toBe("");
  });

  it("recognizes result and submit controls without semantic markup", () => {
    expect(isResultTabLabel("Test Result")).toBe(true);
    expect(isResultTabLabel("Submission Result")).toBe(true);
    expect(isResultTabLabel("Submissions")).toBe(false);
    expect(isSubmitLabel("\n Submit ")).toBe(true);
  });

  it("recognizes a native tab row without treating one label as the row", () => {
    expect(containsNativeTabPair("Testcase | Test Result")).toBe(true);
    expect(containsNativeTabPair("Test Result")).toBe(false);
  });

  it("matches standard classes and preserves multi-variable distinctions", () => {
    expect(complexitiesMatch(
      { display: "O(n)", class: "linear" },
      { display: "O(N)", class: "linear" }
    )).toBe(true);
    expect(complexitiesMatch(
      { display: "O(m + n)", class: "multiple_variables" },
      { display: "O(n+m)", class: "multiple_variables" }
    )).toBe(true);
    expect(complexitiesMatch(
      { display: "O(mn)", class: "multiple_variables" },
      { display: "O(m+n)", class: "multiple_variables" }
    )).toBe(false);
  });

  it("recognizes implementation complexity that must not be graphed", () => {
    expect(isUnknownComplexity({
      display: "Unknown",
      class: "uncertain"
    })).toBe(true);
    expect(isUnknownComplexity({
      display: "O(n)",
      class: "linear"
    })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { extractJson, parseAnalysis } from "../src/background/parser";
import { analysis } from "./fixtures";

describe("structured response parsing", () => {
  it("parses valid fenced structured output", () => {
    expect(parseAnalysis(`\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``)).toEqual(analysis);
  });
  it("extracts a JSON object from limited surrounding text", () => {
    expect(extractJson(`Result: ${JSON.stringify({ ok: true })}`)).toEqual({ ok: true });
  });
  it("rejects malformed or incomplete output with a controlled error", () => {
    expect(() => parseAnalysis('{"recommended":{}}')).toThrow(/incomplete|unsupported/i);
    expect(() => parseAnalysis("not json")).toThrow(/malformed JSON/i);
  });

  it("accepts the compact response used by the result card", () => {
    const compact = {
      recommended: {
        approach: "Hash map",
        time: { display: "O(n)", class: "linear" },
        space: { display: "O(n)", class: "linear" }
      },
      implementation: {
        approach: "Nested loops",
        time: { display: "O(n²)", class: "quadratic" },
        space: { display: "O(1)", class: "constant" }
      }
    };
    const parsed = parseAnalysis(JSON.stringify(compact));
    expect(parsed.recommended.time.case).toBe("uncertain");
    expect(parsed.recommended.time.explanation).toBe("");
    expect(parsed.comparison.verdict).toBe("uncertain");
  });

  it("extracts narrow expected and actual aliases from otherwise valid JSON", () => {
    const aliased = {
      expected: {
        approach: "Hash map",
        time: { display: "O(n)", class: "linear" },
        space: { display: "O(n)", class: "linear" }
      },
      actual: {
        approach: "Nested loops",
        time: { display: "O(n²)", class: "quadratic" },
        space: { display: "O(1)", class: "constant" }
      }
    };
    const parsed = parseAnalysis(JSON.stringify(aliased));
    expect(parsed.recommended.approach).toBe("Hash map");
    expect(parsed.implementation.approach).toBe("Nested loops");
  });

  it("canonicalizes uncertain implementation analysis to Unknown for both metrics", () => {
    const uncertain = {
      recommended: {
        approach: "Hash map",
        time: { display: "O(n)", class: "linear" },
        space: { display: "O(n)", class: "linear" }
      },
      implementation: {
        approach: "Partial traversal",
        time: { display: "Unknown", class: "unknown" },
        space: { display: "O(1)", class: "constant" }
      }
    };
    const parsed = parseAnalysis(JSON.stringify(uncertain));
    expect(parsed.implementation.approach).toBe("Unknown");
    expect(parsed.implementation.time).toMatchObject({
      display: "Unknown",
      class: "uncertain"
    });
    expect(parsed.implementation.space).toMatchObject({
      display: "Unknown",
      class: "uncertain"
    });
  });
});

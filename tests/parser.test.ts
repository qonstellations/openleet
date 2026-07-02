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
});

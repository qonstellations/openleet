import { describe, expect, it } from "vitest";
import {
  SYSTEM_PROMPT,
  createUserPrompt
} from "../src/background/prompt";
import { context } from "./fixtures";

describe("analysis uncertainty instructions", () => {
  it("delegates code completeness judgment to the provider", () => {
    expect(SYSTEM_PROMPT).toContain(
      "OpenLeet does not pre-classify it as complete or incomplete"
    );
  });

  it("requires Unknown for both implementation metrics when analysis is uncertain", () => {
    const prompt = createUserPrompt(context);
    expect(SYSTEM_PROMPT).toContain(
      'BOTH implementation.time and implementation.space to {"display":"Unknown","class":"uncertain"}'
    );
    expect(prompt).toContain(
      'BOTH time and space as {"display":"Unknown","class":"uncertain"}'
    );
  });
});

import type { Analysis, ProblemContext, ProviderProfile } from "../src/shared/schemas";

export const profile: ProviderProfile = {
  id: "9a1f7043-b036-43f6-8f46-f6f089422d10",
  name: "Test",
  type: "openai",
  endpoint: "https://api.example.com/v1",
  model: "test-model",
  timeoutMs: 60_000,
  keyStorage: "session"
};

export const context: ProblemContext = {
  slug: "two-sum",
  title: "Two Sum",
  statement: "Given an array and target, return indices whose values add to target. Constraints are included.",
  language: "typescript",
  code: "function twoSum(nums: number[], target: number) { return []; }",
  url: "https://leetcode.com/problems/two-sum/",
  fingerprint: "12345678"
};

export const analysis: Analysis = {
  recommended: {
    approach: "Hash map",
    time: { display: "O(n)", class: "linear", case: "worst", explanation: "One pass." },
    space: { display: "O(n)", class: "linear", case: "worst", explanation: "Map entries." }
  },
  implementation: {
    approach: "Nested loops",
    time: { display: "O(n²)", class: "quadratic", case: "worst", explanation: "All pairs." },
    space: { display: "O(1)", class: "constant", case: "worst", explanation: "No growing storage." }
  },
  comparison: { verdict: "time_space_tradeoff", summary: "Slower but constant auxiliary space.", mostImportantDifference: "Map versus pair enumeration." },
  confidence: "high",
  uncertainty: ""
};

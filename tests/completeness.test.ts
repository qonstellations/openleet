import { describe, expect, it } from "vitest";
import { incompleteCodeMessage } from "../src/content/completeness";

describe("incomplete code detection", () => {
  it("rejects unfinished declarations and missing returns", () => {
    expect(incompleteCodeMessage(`
      vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); i++) {
          int
        }
      }
    `, "cpp")).toMatch(/incomplete code/i);

    expect(incompleteCodeMessage(`
      int solve(int n) {
        n += 1;
      }
    `, "cpp")).toMatch(/incomplete code/i);
  });

  it("rejects placeholders and unbalanced syntax", () => {
    expect(incompleteCodeMessage("def solve(nums):\n    pass", "python")).toMatch(/incomplete code/i);
    expect(incompleteCodeMessage("function solve(nums) { return nums;", "javascript")).toMatch(/incomplete code/i);
  });

  it("allows complete returning and in-place implementations", () => {
    expect(incompleteCodeMessage(`
      vector<int> twoSum(vector<int>& nums, int target) {
        return {0, 1};
      }
    `, "cpp")).toBeUndefined();

    expect(incompleteCodeMessage(`
      void setZeroes(vector<vector<int>>& matrix) {
        matrix[0][0] = 0;
      }
    `, "cpp")).toBeUndefined();
  });
});

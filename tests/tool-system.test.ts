import { describe, expect, it } from "vitest";
import { createComplexityTool } from "../src/content/complexity-tool";
import {
  ToolRegistry,
  type ToolDefinition
} from "../src/content/tool-system";

function tool(id: string): ToolDefinition {
  return {
    id,
    buttonLabel: id,
    buttonIcon: "•",
    resolveButtonMount: () => undefined,
    createController: () => ({
      renderBody: () => [],
      getHeaderActions: () => [],
      onPageChange: () => undefined,
      dispose: () => undefined
    })
  };
}

describe("tool registry", () => {
  it("rejects duplicate stable IDs", () => {
    expect(() => new ToolRegistry([tool("same"), tool("same")]))
      .toThrow("Duplicate tool ID: same");
  });

  it("keeps unrelated definitions and mount resolvers independent", () => {
    let firstCalls = 0;
    let secondCalls = 0;
    const first = {
      ...tool("first"),
      resolveButtonMount: () => {
        firstCalls += 1;
        return undefined;
      }
    };
    const second = {
      ...tool("second"),
      resolveButtonMount: () => {
        secondCalls += 1;
        return undefined;
      }
    };
    const registry = new ToolRegistry([first, second]);
    registry.get("first")?.resolveButtonMount();
    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(0);
  });

  it("defines Complexity with a constant label and stable ID", () => {
    const complexity = createComplexityTool();
    expect(complexity.id).toBe("complexity");
    expect(complexity.buttonLabel).toBe("Complexity");
  });
});

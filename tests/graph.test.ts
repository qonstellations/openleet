import { describe, expect, it } from "vitest";
import { graphSeries, svgPath } from "../src/content/graph";

describe("complexity graph generation", () => {
  it("generates normalized relative curves for common classes", () => {
    const linear = graphSeries("linear", "linear");
    const quadratic = graphSeries("quadratic", "quadratic");
    expect(linear.supported).toBe(true);
    expect(linear.points).toHaveLength(30);
    expect(linear.points.at(-1)?.y).toBe(1);
    expect(quadratic.points[15]!.y).toBeLessThan(linear.points[15]!.y);
    expect(svgPath(linear)).toMatch(/^M/);
  });
  it.each(["multiple_variables", "amortized", "average_case", "output_sensitive", "unusual", "uncertain"] as const)("degrades gracefully for %s", (kind) => {
    const result = graphSeries("unsupported", kind);
    expect(result.supported).toBe(false);
    expect(result.note).toBeTruthy();
    expect(svgPath(result)).toBe("");
  });
});

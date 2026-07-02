import { describe, expect, it } from "vitest";
import { graphSeries, normalizeGraphShapes, svgPath } from "../src/content/graph";

describe("complexity graph generation", () => {
  it("normalizes each curve to emphasize growth shape", () => {
    const linear = graphSeries("linear", "linear");
    const quadratic = graphSeries("quadratic", "quadratic");
    const [scaledLinear, scaledQuadratic] = normalizeGraphShapes([linear, quadratic]);
    expect(linear.supported).toBe(true);
    expect(linear.points).toHaveLength(30);
    expect(scaledLinear!.points.at(-1)!.y).toBeCloseTo(scaledQuadratic!.points.at(-1)!.y);
    expect(scaledLinear!.points[15]!.y).toBeGreaterThan(scaledQuadratic!.points[15]!.y);
    expect(scaledQuadratic!.points[15]!.y).toBeGreaterThan(0);
    expect(svgPath(scaledLinear!)).toMatch(/^M/);
  });
  it.each(["multiple_variables", "amortized", "average_case", "output_sensitive", "unusual", "uncertain"] as const)("degrades gracefully for %s", (kind) => {
    const result = graphSeries("unsupported", kind);
    expect(result.supported).toBe(false);
    expect(result.note).toBeTruthy();
    expect(svgPath(result)).toBe("");
  });
});

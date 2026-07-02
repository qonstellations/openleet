import { describe, expect, it } from "vitest";
import { graphSeries, normalizeGraphShapes, svgPath } from "../src/content/graph";

describe("complexity graph generation", () => {
  it("blends recognizable shape with relative terminal growth", () => {
    const linear = graphSeries("linear", "linear");
    const quadratic = graphSeries("quadratic", "quadratic");
    const [scaledLinear, scaledQuadratic] = normalizeGraphShapes([linear, quadratic]);
    expect(linear.supported).toBe(true);
    expect(linear.points).toHaveLength(10);
    expect(scaledLinear!.points[6]!.y).toBeGreaterThan(scaledQuadratic!.points[6]!.y);
    expect(scaledQuadratic!.points[7]!.y).toBeGreaterThan(scaledLinear!.points[7]!.y);
    const terminalGap = scaledQuadratic!.points.at(-1)!.y
      - scaledLinear!.points.at(-1)!.y;
    expect(terminalGap).toBeGreaterThan(0.1);
    expect(terminalGap).toBeLessThan(0.3);
    expect(svgPath(scaledLinear!)).toMatch(/^M/);
  });

  it("produces identical paths for identical complexity classes", () => {
    const [expected, implementation] = normalizeGraphShapes([
      graphSeries("expected", "linearithmic"),
      graphSeries("implementation", "linearithmic")
    ]);
    expect(svgPath(expected!)).toBe(svgPath(implementation!));
  });

  it("keeps constant complexity on a low horizontal line", () => {
    const [constant] = normalizeGraphShapes([
      graphSeries("constant", "constant"),
      graphSeries("linear", "linear")
    ]);
    expect(new Set(constant!.points.map((point) => point.y))).toEqual(new Set([0.08]));
  });

  it.each(["multiple_variables", "amortized", "average_case", "output_sensitive", "unusual", "uncertain"] as const)("degrades gracefully for %s", (kind) => {
    const result = graphSeries("unsupported", kind);
    expect(result.supported).toBe(false);
    expect(result.note).toBeTruthy();
    expect(svgPath(result)).toBe("");
  });
});

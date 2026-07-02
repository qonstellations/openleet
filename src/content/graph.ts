import type { ComplexityClass } from "../shared/schemas";

const RANK: Partial<Record<ComplexityClass, number>> = {
  constant: 0, logarithmic: 1, linear: 2, linearithmic: 3,
  quadratic: 4, cubic: 5, polynomial: 5.5, exponential: 7, factorial: 8
};

export interface GraphSeries {
  label: string;
  supported: boolean;
  points: Array<{ x: number; y: number }>;
  note?: string;
}

export function graphSeries(label: string, complexity: ComplexityClass): GraphSeries {
  const rank = RANK[complexity];
  if (rank === undefined) {
    return { label, supported: false, points: [], note: graphFallback(complexity) };
  }
  const points = Array.from({ length: 10 }, (_, index) => {
    const x = index / 9;
    const raw = growth(rank, index + 1);
    return { x, y: raw };
  });
  return { label, supported: true, points };
}

export function normalizeGraphShapes(series: GraphSeries[], headroom = 1.08): GraphSeries[] {
  const supported = series.filter((item) => item.supported && item.points.length > 0);
  const largestTerminalValue = Math.max(
    1,
    ...supported.map((item) => item.points.at(-1)?.y ?? 0)
  );
  const padding = Math.max(1, headroom);
  return series.map((item) => item.supported ? {
    ...item,
    points: normalizeShape(item.points, largestTerminalValue, padding)
  } : item);
}

function normalizeShape(
  points: GraphSeries["points"],
  largestTerminalValue: number,
  headroom: number
): GraphSeries["points"] {
  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return points.map((point) => ({ x: point.x, y: 0.08 }));
  const terminalValue = points.at(-1)?.y ?? 0;
  const relativeMagnitude = Math.max(0, terminalValue / largestTerminalValue);
  const amplitude = 0.72 + 0.28 * Math.sqrt(relativeMagnitude);
  return points.map((point) => ({
    x: point.x,
    y: ((point.y - min) / range) * amplitude / headroom
  }));
}

function growth(rank: number, n: number): number {
  if (rank === 0) return 1;
  if (rank === 1) return Math.log2(n + 1);
  if (rank === 2) return n;
  if (rank === 3) return n * Math.log2(n + 1);
  if (rank === 4) return n ** 2;
  if (rank === 5) return n ** 3;
  if (rank === 5.5) return n ** 4;
  if (rank === 7) return 2 ** n;
  return factorial(Math.min(10, Math.round(n)));
}

function factorial(n: number): number {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
}

function graphFallback(complexity: ComplexityClass): string {
  const messages: Partial<Record<ComplexityClass, string>> = {
    multiple_variables: "Multiple independent variables cannot be reduced to one honest growth curve.",
    amortized: "Amortised cost depends on an operation sequence; see the written classification.",
    average_case: "Average-case growth depends on an input distribution; see the written classification.",
    output_sensitive: "Growth depends on output size; see the written classification.",
    unusual: "This mathematical form is not mapped to a standard relative-growth curve.",
    uncertain: "The analysis is too uncertain to draw a meaningful curve."
  };
  return messages[complexity] ?? "This complexity cannot be graphed reliably.";
}

export function svgPath(series: GraphSeries, width = 300, height = 110): string {
  if (!series.supported) return "";
  return series.points.map((point, index) => {
    const x = 10 + point.x * (width - 20);
    const y = height - 10 - point.y * (height - 20);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

import type { ComplexityClass } from "../shared/schemas";

export function shortApproach(value: string): string {
  return value.trim().split(/\s+/u).filter(Boolean).slice(0, 3).join(" ");
}

export function normalizeText(value: string | null): string {
  return (value ?? "").replace(/\s+/gu, " ").trim().toLowerCase();
}

export function isResultTabLabel(value: string | null): boolean {
  const label = normalizeText(value);
  return label === "test result" || label === "result" || label === "submission result";
}

export function isSubmitLabel(value: string | null): boolean {
  return normalizeText(value) === "submit";
}

export function containsNativeTabPair(value: string | null): boolean {
  const text = normalizeText(value);
  return text.includes("testcase") && (
    text.includes("test result") || text.includes("submission result")
  );
}

export function complexitiesMatch(
  expected: { display: string; class: ComplexityClass },
  implemented: { display: string; class: ComplexityClass }
): boolean {
  if (expected.class !== implemented.class) return false;
  if (!DISPLAY_SENSITIVE_CLASSES.has(expected.class)) return true;
  return canonicalComplexity(expected.display) === canonicalComplexity(implemented.display);
}

export function isUnknownComplexity(
  complexity: { display: string; class: ComplexityClass }
): boolean {
  return complexity.class === "uncertain"
    || normalizeText(complexity.display) === "unknown";
}

const DISPLAY_SENSITIVE_CLASSES = new Set<ComplexityClass>([
  "polynomial", "multiple_variables", "amortized", "average_case",
  "output_sensitive", "unusual", "uncertain"
]);

function canonicalComplexity(value: string): string {
  const compact = value
    .toLowerCase()
    .replace(/[·×*]/gu, "")
    .replace(/²/gu, "^2")
    .replace(/³/gu, "^3")
    .replace(/\s+/gu, "")
    .replace(/^o\((.*)\)$/u, "$1");
  if (!compact.includes("+")) return compact;
  return compact.split("+").sort().join("+");
}

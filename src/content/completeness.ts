const C_FAMILY = /\b(c\+\+|cpp|c|java|c#|csharp|rust)\b/iu;

export function incompleteCodeMessage(code: string, language: string): string | undefined {
  const trimmed = code.trim();
  if (!trimmed) return incompleteMessage();
  if (/\b(TODO|FIXME|YOUR CODE|NOT IMPLEMENTED)\b/iu.test(trimmed)) return incompleteMessage();
  if (/^\s*(?:pass|\.\.\.)\s*$/mu.test(trimmed)) return incompleteMessage();
  if (/\b(?:NotImplementedError|UnsupportedOperationException)\b/u.test(trimmed)) return incompleteMessage();

  const scanned = scanCode(trimmed);
  if (!scanned.complete || scanned.stack.length) return incompleteMessage();
  if (/^\s*(?:return|throw|yield|await|new)\s*;?\s*$/mu.test(scanned.text)) return incompleteMessage();

  if (C_FAMILY.test(language)) {
    if (/^\s*(?:(?:unsigned|signed)\s+)?(?:int|long|short|float|double|char|bool|auto|string)\s*;?\s*$/mu.test(scanned.text)) {
      return incompleteMessage();
    }
    const nonVoidFunction = /(?:^|\n)\s*(?!void\b)(?:[\w:[\]<>,*&]+\s+)+[A-Za-z_]\w*\s*\([^;{}]*\)\s*(?:const\s*)?\{/mu;
    if (nonVoidFunction.test(scanned.text) && !/\breturn\b/u.test(scanned.text)) {
      return incompleteMessage();
    }
  }
  return undefined;
}

function incompleteMessage(): string {
  return "Incomplete code. Finish the implementation before analysing complexity.";
}

function scanCode(code: string): { text: string; stack: string[]; complete: boolean } {
  const stack: string[] = [];
  let text = "";
  let mode: "normal" | "line" | "block" | "single" | "double" | "template" = "normal";
  let escaped = false;
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]!;
    const next = code[index + 1];
    if (mode === "line") {
      if (char === "\n") { mode = "normal"; text += "\n"; } else text += " ";
      continue;
    }
    if (mode === "block") {
      if (char === "*" && next === "/") { mode = "normal"; text += "  "; index += 1; }
      else text += char === "\n" ? "\n" : " ";
      continue;
    }
    if (mode !== "normal") {
      text += char === "\n" ? "\n" : " ";
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (
        (mode === "single" && char === "'") ||
        (mode === "double" && char === '"') ||
        (mode === "template" && char === "`")
      ) mode = "normal";
      continue;
    }
    if (char === "/" && next === "/") { mode = "line"; text += "  "; index += 1; continue; }
    if (char === "/" && next === "*") { mode = "block"; text += "  "; index += 1; continue; }
    if (char === "'") { mode = "single"; text += " "; continue; }
    if (char === '"') { mode = "double"; text += " "; continue; }
    if (char === "`") { mode = "template"; text += " "; continue; }
    if (char === "(" || char === "[" || char === "{") stack.push(char);
    if (char === ")" || char === "]" || char === "}") {
      if (stack.pop() !== pairs[char]) return { text, stack, complete: false };
    }
    text += char;
  }
  return { text, stack, complete: mode === "normal" || mode === "line" };
}

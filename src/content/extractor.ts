import { ProblemContextSchema, type ProblemContext } from "../shared/schemas";

const STATEMENT_SELECTORS = [
  '[data-track-load="description_content"]',
  '[data-cy="question-content"]',
  '.elfjS',
  'div[class*="description"]'
];

export async function extractProblem(slug: string): Promise<ProblemContext> {
  const title = extractTitle(slug);
  const statement = extractStatement();
  const bridge = await requestEditor();
  const code = bridge.code || extractEditorDom();
  const language = bridge.language || extractLanguage();
  if (!statement) throw new Error("Problem information is not available yet. Wait for LeetCode to finish loading, then retry.");
  if (!code) throw new Error("OpenLeet could not read the editor. Ensure the code editor is visible and loaded, then retry.");
  const fingerprint = await fingerprintOf(`${slug}\0${language}\0${code}`);
  return ProblemContextSchema.parse({
    slug, title, statement, language: language || "unknown", code,
    url: location.href, fingerprint
  });
}

function extractTitle(slug: string): string {
  const selectors = ['[data-cy="question-title"]', 'a[href^="/problems/"][class*="text-title"]', 'div[class*="text-title-large"]'];
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) return text.replace(/^\d+\.\s*/, "");
  }
  return slug.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function extractStatement(): string {
  for (const selector of STATEMENT_SELECTORS) {
    const node = document.querySelector(selector);
    const text = node?.textContent?.replace(/\s+/g, " ").trim();
    if (text && text.length >= 20) return text.slice(0, 100_000);
  }
  return "";
}

function extractEditorDom(): string {
  const textareas = [...document.querySelectorAll<HTMLTextAreaElement>('.monaco-editor textarea, textarea[data-mode-id], .CodeMirror textarea')];
  const value = textareas.map((item) => item.value).sort((a, b) => b.length - a.length)[0];
  if (value && value.length > 10) return value;
  const lines = [...document.querySelectorAll(".monaco-editor .view-lines .view-line")]
    .map((line) => line.textContent ?? "").join("\n").trim();
  return lines;
}

function extractLanguage(): string {
  const selectors = [
    '[data-cy="lang-select"]', 'button[id*="headlessui-listbox-button"]',
    'button[class*="rounded"][class*="text-label"]'
  ];
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text && text.length < 80) return text;
  }
  return "unknown";
}

async function requestEditor(): Promise<{ code: string; language: string }> {
  const nonce = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      document.removeEventListener("openleet:editor-response", listener as EventListener);
      resolve({ code: "", language: "" });
    }, 700);
    const listener = (event: CustomEvent<{ nonce: string; code?: string; language?: string }>) => {
      if (event.detail?.nonce !== nonce) return;
      clearTimeout(timeout);
      document.removeEventListener("openleet:editor-response", listener as EventListener);
      resolve({ code: event.detail.code ?? "", language: event.detail.language ?? "" });
    };
    document.addEventListener("openleet:editor-response", listener as EventListener);
    document.dispatchEvent(new CustomEvent("openleet:editor-request", { detail: { nonce } }));
  });
}

async function fingerprintOf(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

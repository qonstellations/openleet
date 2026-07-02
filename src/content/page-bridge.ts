declare global {
  interface Window { monaco?: { editor?: { getModels?: () => Array<{ getValue: () => string; getLanguageId?: () => string }> } } }
}

export {};

document.addEventListener("openleet:editor-request", ((event: CustomEvent<{ nonce: string }>) => {
  const nonce = event.detail?.nonce;
  if (!nonce) return;
  try {
    const models = window.monaco?.editor?.getModels?.() ?? [];
    const model = models
      .filter((item) => typeof item.getValue === "function")
      .sort((a, b) => b.getValue().length - a.getValue().length)[0];
    document.dispatchEvent(new CustomEvent("openleet:editor-response", {
      detail: { nonce, code: model?.getValue() ?? "", language: model?.getLanguageId?.() ?? "" }
    }));
  } catch {
    document.dispatchEvent(new CustomEvent("openleet:editor-response", { detail: { nonce, code: "", language: "" } }));
  }
}) as EventListener);

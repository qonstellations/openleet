import { createComplexityTool } from "./complexity-tool";
import { detectPageStatus, type PageStatus } from "./page-status";
import {
  ToolButtonManager,
  ToolRegistry,
  type ToolController,
  type ToolDefinition
} from "./tool-system";
import { ToolWindowManager } from "./window-manager";

interface ToolRuntime {
  definition: ToolDefinition;
  controller: ToolController;
  button: ToolButtonManager;
}

let currentUrl = location.href;
let page = readPageStatus();
const registry = new ToolRegistry([createComplexityTool()]);
const runtimes: ToolRuntime[] = [];
const windowManager = new ToolWindowManager((id) => {
  runtimes.find((runtime) => runtime.definition.id === id)?.button.render();
});

for (const definition of registry.list()) {
  const controller = definition.createController({
    getPageStatus: readPageStatus,
    invalidateButton: () => {
      runtimes.find((runtime) => runtime.definition.id === definition.id)
        ?.button.render();
    },
    invalidateWindow: () => windowManager.render(definition.id)
  });
  windowManager.register(definition.id, controller);
  const button = new ToolButtonManager(
    definition,
    () => windowManager.toggle(definition.id),
    () => windowManager.isOpen(definition.id)
  );
  runtimes.push({ definition, controller, button });
}

injectBridge();
syncToolButtons();

const observer = new MutationObserver(() => {
  windowManager.ensureConnected();
  scheduleToolButtonSync();
  if (currentUrl !== location.href) onNavigation();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", onNavigation);
document.addEventListener("click", onDocumentClick, true);
window.addEventListener("pagehide", dispose, { once: true });

function readPageStatus(): PageStatus {
  return detectPageStatus(new URL(location.href));
}

function onNavigation(): void {
  if (currentUrl === location.href) return;
  currentUrl = location.href;
  page = readPageStatus();
  windowManager.closeAll();
  for (const runtime of runtimes) {
    runtime.controller.onPageChange?.(page);
    runtime.button.remove();
  }
  scheduleToolButtonSync();
}

function onDocumentClick(event: MouseEvent): void {
  for (const runtime of runtimes) {
    runtime.controller.onDocumentClick?.(event);
  }
}

let toolButtonSyncScheduled = false;

function scheduleToolButtonSync(): void {
  if (toolButtonSyncScheduled) return;
  toolButtonSyncScheduled = true;
  queueMicrotask(() => {
    toolButtonSyncScheduled = false;
    syncToolButtons();
  });
}

function syncToolButtons(): void {
  for (const runtime of runtimes) runtime.button.sync(page);
}

function injectBridge(): void {
  if (document.querySelector("script[data-openleet-bridge]")) return;
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.dataset.openleetBridge = "true";
  script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
}

function dispose(): void {
  observer.disconnect();
  window.removeEventListener("popstate", onNavigation);
  document.removeEventListener("click", onDocumentClick, true);
  for (const runtime of runtimes) {
    runtime.controller.dispose?.();
  }
  windowManager.dispose();
  for (const runtime of runtimes) runtime.button.dispose();
}

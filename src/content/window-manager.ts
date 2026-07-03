import type { HeaderAction, ToolController } from "./tool-system";
import {
  WINDOW_WIDTH,
  calculateDragPosition,
  clampResizedHeight,
  clampWindowPosition,
  reconcileUserHeight,
  staggeredDefaultPosition,
  type ViewportSize,
  type WindowGeometry
} from "./window-layout";
import { STYLES } from "./styles";

interface ToolWindowRegistration {
  id: string;
  controller: ToolController;
}

interface ToolWindow {
  id: string;
  controller: ToolController;
  panel: HTMLElement;
  header: HTMLElement;
  actions: HTMLElement;
  body: HTMLElement;
  resizeHandle: HTMLElement;
  geometry: WindowGeometry;
  naturalHeight: number;
  openIndex: number;
  hasCustomPosition: boolean;
  hasRendered: boolean;
}

export class ToolWindowManager {
  private readonly host: HTMLDivElement;
  private readonly root: HTMLDivElement;
  private readonly registrations = new Map<string, ToolWindowRegistration>();
  private readonly windows = new Map<string, ToolWindow>();
  private nextZIndex = 2_147_480_000;

  constructor(private readonly onVisibilityChange: (id: string) => void) {
    this.host = document.createElement("div");
    this.host.id = "openleet-extension-root";
    const shadow = this.host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STYLES;
    shadow.append(style);
    this.root = document.createElement("div");
    shadow.append(this.root);
    document.documentElement.append(this.host);
    window.addEventListener("resize", this.onViewportChange);
  }

  register(id: string, controller: ToolController): void {
    if (this.registrations.has(id)) throw new Error(`Tool window already registered: ${id}`);
    this.registrations.set(id, { id, controller });
  }

  ensureConnected(): void {
    if (!this.host.isConnected) document.documentElement.append(this.host);
  }

  isOpen(id: string): boolean {
    return this.windows.has(id);
  }

  toggle(id: string): void {
    if (this.isOpen(id)) this.close(id);
    else this.open(id);
  }

  open(id: string): void {
    const registration = this.registrations.get(id);
    if (!registration || this.windows.has(id)) return;
    this.ensureConnected();
    const panel = element("section", "panel");
    panel.setAttribute("aria-label", "OpenLeet tool window");
    const header = element("header", "header");
    const brand = element("div", "brand");
    brand.append(document.createTextNode("Open"), element("span", "mark", "Leet"));
    const actions = element("div", "header-actions");
    header.append(brand, actions);
    const body = element("div", "body");
    const resizeHandle = element("div", "resize-handle");
    resizeHandle.setAttribute("role", "separator");
    resizeHandle.setAttribute("aria-label", "Resize OpenLeet window vertically");
    resizeHandle.setAttribute("aria-orientation", "horizontal");
    panel.append(header, body, resizeHandle);
    this.root.append(panel);

    const entry: ToolWindow = {
      id,
      controller: registration.controller,
      panel,
      header,
      actions,
      body,
      resizeHandle,
      geometry: { width: WINDOW_WIDTH, left: 0, top: 0 },
      naturalHeight: 0,
      openIndex: this.windows.size,
      hasCustomPosition: false,
      hasRendered: false
    };
    this.windows.set(id, entry);
    this.bindDragging(entry);
    this.bindResizing(entry);
    this.raise(entry);
    this.render(id);
    this.onVisibilityChange(id);
  }

  close(id: string): void {
    const entry = this.windows.get(id);
    if (!entry) return;
    entry.panel.remove();
    this.windows.delete(id);
    this.onVisibilityChange(id);
  }

  closeAll(): void {
    for (const id of [...this.windows.keys()]) this.close(id);
  }

  render(id: string): void {
    const entry = this.windows.get(id);
    if (!entry) return;
    if (entry.hasRendered) entry.panel.classList.add("no-animation");
    entry.body.replaceChildren(...entry.controller.renderBody());
    this.renderActions(entry, entry.controller.getHeaderActions?.() ?? []);
    this.updateMeasurements(entry);
    entry.hasRendered = true;
  }

  dispose(): void {
    this.closeAll();
    window.removeEventListener("resize", this.onViewportChange);
    this.host.remove();
    this.registrations.clear();
  }

  private renderActions(entry: ToolWindow, actions: HeaderAction[]): void {
    entry.actions.replaceChildren();
    for (const action of actions) {
      if (action.visible === false) continue;
      const button = element("button", "icon", action.icon);
      button.setAttribute("aria-label", action.accessibleLabel);
      button.title = action.accessibleLabel;
      button.dataset.actionId = action.id;
      button.disabled = action.disabled ?? false;
      button.addEventListener("click", action.onActivate);
      entry.actions.append(button);
    }
    const close = element("button", "icon", "×");
    close.setAttribute("aria-label", "Close OpenLeet");
    close.title = "Close OpenLeet";
    close.addEventListener("click", () => this.close(entry.id));
    entry.actions.append(close);
  }

  private updateMeasurements(entry: ToolWindow): void {
    const viewport = viewportSize();
    const borderHeight = 2;
    entry.naturalHeight = borderHeight
      + entry.header.offsetHeight
      + entry.body.scrollHeight
      + entry.resizeHandle.offsetHeight;
    const reconciled = reconcileUserHeight(
      entry.geometry.userSelectedHeight,
      entry.naturalHeight,
      viewport.height
    );
    entry.panel.style.maxHeight = `${reconciled.maximum}px`;
    if (reconciled.userSelectedHeight === undefined) {
      entry.panel.style.removeProperty("height");
      delete entry.geometry.userSelectedHeight;
    } else {
      entry.geometry.userSelectedHeight = reconciled.userSelectedHeight;
      entry.panel.style.height = `${reconciled.userSelectedHeight}px`;
    }

    const size = {
      width: WINDOW_WIDTH,
      height: reconciled.userSelectedHeight ?? Math.min(entry.naturalHeight, reconciled.maximum)
    };
    const position = entry.hasCustomPosition
      ? clampWindowPosition(entry.geometry, size, viewport)
      : staggeredDefaultPosition(viewport, size, entry.openIndex);
    this.applyPosition(entry, position);
  }

  private bindDragging(entry: ToolWindow): void {
    entry.header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || isInteractiveTarget(event.target)) return;
      event.preventDefault();
      this.raise(entry);
      entry.panel.classList.add("interacting");
      const rect = entry.panel.getBoundingClientRect();
      const start = { left: rect.left, top: rect.top };
      const pointerStart = { left: event.clientX, top: event.clientY };
      entry.hasCustomPosition = true;
      entry.header.setPointerCapture(event.pointerId);

      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return;
        const position = calculateDragPosition(start, {
          left: moveEvent.clientX - pointerStart.left,
          top: moveEvent.clientY - pointerStart.top
        }, {
          width: rect.width,
          height: entry.panel.getBoundingClientRect().height
        }, viewportSize());
        this.applyPosition(entry, position);
      };
      const finish = (finishEvent: PointerEvent) => {
        if (finishEvent.pointerId !== event.pointerId) return;
        entry.header.removeEventListener("pointermove", move);
        entry.header.removeEventListener("pointerup", finish);
        entry.header.removeEventListener("pointercancel", finish);
        if (entry.header.hasPointerCapture(event.pointerId)) {
          entry.header.releasePointerCapture(event.pointerId);
        }
        entry.panel.classList.remove("interacting");
      };
      entry.header.addEventListener("pointermove", move);
      entry.header.addEventListener("pointerup", finish);
      entry.header.addEventListener("pointercancel", finish);
    });
  }

  private bindResizing(entry: ToolWindow): void {
    entry.resizeHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      this.raise(entry);
      entry.panel.classList.add("interacting");
      const startHeight = entry.panel.getBoundingClientRect().height;
      const startY = event.clientY;
      entry.hasCustomPosition = true;
      entry.resizeHandle.setPointerCapture(event.pointerId);

      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return;
        const height = clampResizedHeight(
          startHeight + moveEvent.clientY - startY,
          entry.naturalHeight,
          window.innerHeight
        );
        entry.geometry.userSelectedHeight = height;
        entry.panel.style.height = `${height}px`;
        const rect = entry.panel.getBoundingClientRect();
        const position = clampWindowPosition(entry.geometry, {
          width: WINDOW_WIDTH,
          height: rect.height
        }, viewportSize());
        this.applyPosition(entry, position);
      };
      const finish = (finishEvent: PointerEvent) => {
        if (finishEvent.pointerId !== event.pointerId) return;
        entry.resizeHandle.removeEventListener("pointermove", move);
        entry.resizeHandle.removeEventListener("pointerup", finish);
        entry.resizeHandle.removeEventListener("pointercancel", finish);
        if (entry.resizeHandle.hasPointerCapture(event.pointerId)) {
          entry.resizeHandle.releasePointerCapture(event.pointerId);
        }
        entry.panel.classList.remove("interacting");
      };
      entry.resizeHandle.addEventListener("pointermove", move);
      entry.resizeHandle.addEventListener("pointerup", finish);
      entry.resizeHandle.addEventListener("pointercancel", finish);
    });
  }

  private applyPosition(
    entry: ToolWindow,
    position: { left: number; top: number }
  ): void {
    entry.geometry.left = position.left;
    entry.geometry.top = position.top;
    entry.panel.style.left = `${position.left}px`;
    entry.panel.style.top = `${position.top}px`;
  }

  private raise(entry: ToolWindow): void {
    this.nextZIndex += 1;
    entry.panel.style.zIndex = String(this.nextZIndex);
  }

  private readonly onViewportChange = () => {
    for (const entry of this.windows.values()) this.updateMeasurements(entry);
  };
}

function viewportSize(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(
    "button,input,select,textarea,a,[role=button],.resize-handle"
  ));
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = ""
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

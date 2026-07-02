import type { PageStatus } from "./restrictions";
import { STYLES } from "./styles";

export type ToolButtonInsertion = "before" | "after" | "prepend" | "append";

export interface ToolButtonMount {
  anchor: HTMLElement;
  strategy: ToolButtonInsertion;
  isValid?: (buttonHost: HTMLElement) => boolean;
}

export interface HeaderAction {
  id: string;
  accessibleLabel: string;
  icon: string;
  visible?: boolean;
  disabled?: boolean;
  onActivate: () => void;
}

export interface ToolContext {
  getPageStatus: () => PageStatus;
  invalidateButton: () => void;
  invalidateWindow: () => void;
}

export interface ToolController {
  renderBody: () => Node[];
  getHeaderActions?: () => HeaderAction[];
  onPageChange?: (page: PageStatus) => void;
  onDocumentClick?: (event: MouseEvent) => void;
  dispose?: () => void;
}

export interface ToolDefinition {
  id: string;
  buttonLabel: string;
  buttonIcon: string;
  resolveButtonMount: () => ToolButtonMount | undefined;
  createController: (context: ToolContext) => ToolController;
}

export class ToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();

  constructor(definitions: readonly ToolDefinition[]) {
    for (const definition of definitions) {
      if (this.definitions.has(definition.id)) {
        throw new Error(`Duplicate tool ID: ${definition.id}`);
      }
      this.definitions.set(definition.id, definition);
    }
  }

  list(): ToolDefinition[] {
    return [...this.definitions.values()];
  }

  get(id: string): ToolDefinition | undefined {
    return this.definitions.get(id);
  }
}

export class ToolButtonManager {
  private readonly host: HTMLSpanElement;
  private readonly root: HTMLSpanElement;
  private currentMount: ToolButtonMount | undefined;

  constructor(
    private readonly definition: ToolDefinition,
    private readonly onActivate: () => void,
    private readonly isActive: () => boolean
  ) {
    this.host = document.createElement("span");
    this.host.dataset.openleetToolButton = definition.id;
    const shadow = this.host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STYLES;
    shadow.append(style);
    this.root = document.createElement("span");
    this.root.className = "tool-button-root";
    shadow.append(this.root);
    for (const eventName of ["click", "mousedown", "pointerdown"]) {
      this.host.addEventListener(eventName, (event) => event.stopPropagation());
    }
  }

  sync(page: PageStatus): void {
    if (!page.supported || page.restricted) {
      this.remove();
      return;
    }
    const nextMount = this.definition.resolveButtonMount();
    if (!nextMount?.anchor.isConnected) {
      this.remove();
      return;
    }
    if (!this.isCurrentMountValid(nextMount)) {
      insertAtMount(this.host, nextMount);
      this.currentMount = nextMount;
    }
    this.render();
  }

  render(): void {
    this.root.replaceChildren();
    const button = document.createElement("button");
    button.className = `result-tab${this.isActive() ? " active" : ""}`;
    button.type = "button";
    const icon = document.createElement("span");
    icon.className = "sparkle";
    icon.textContent = this.definition.buttonIcon;
    button.append(icon, document.createTextNode(this.definition.buttonLabel));
    button.title = `Open ${this.definition.buttonLabel} in OpenLeet`;
    button.addEventListener("click", this.onActivate);
    this.root.append(button);
  }

  remove(): void {
    this.host.remove();
    this.currentMount = undefined;
  }

  dispose(): void {
    this.remove();
    this.root.replaceChildren();
  }

  private isCurrentMountValid(nextMount: ToolButtonMount): boolean {
    const current = this.currentMount;
    if (!current || current.anchor !== nextMount.anchor || current.strategy !== nextMount.strategy) {
      return false;
    }
    if (!this.host.isConnected || !isAtMount(this.host, nextMount)) return false;
    return nextMount.isValid?.(this.host) ?? true;
  }
}

function insertAtMount(host: HTMLElement, mount: ToolButtonMount): void {
  if (mount.strategy === "before") mount.anchor.before(host);
  else if (mount.strategy === "after") mount.anchor.after(host);
  else if (mount.strategy === "prepend") mount.anchor.prepend(host);
  else mount.anchor.append(host);
}

function isAtMount(host: HTMLElement, mount: ToolButtonMount): boolean {
  if (mount.strategy === "before") return host.nextElementSibling === mount.anchor;
  if (mount.strategy === "after") return host.previousElementSibling === mount.anchor;
  if (mount.strategy === "prepend") {
    return host.parentElement === mount.anchor && mount.anchor.firstElementChild === host;
  }
  return host.parentElement === mount.anchor && mount.anchor.lastElementChild === host;
}

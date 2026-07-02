import { extractProblem } from "./extractor";
import { graphSeries, normalizeGraphShapes, svgPath } from "./graph";
import {
  complexitiesMatch,
  containsNativeTabPair,
  isUnknownComplexity,
  isResultTabLabel,
  isSubmitLabel,
  normalizeText,
  shortApproach
} from "./presentation";
import { fetchSolutionReferences } from "./references";
import { isResponseCurrent } from "./stale";
import {
  type HeaderAction,
  type ToolButtonMount,
  type ToolContext,
  type ToolController,
  type ToolDefinition
} from "./tool-system";
import { getActiveProfileId, listProfiles, setActiveProfileId } from "../shared/storage";
import type { Analysis, ProviderProfile, RuntimeResponse } from "../shared/schemas";

type ViewState = "idle" | "loading" | "success" | "error";

export const COMPLEXITY_TOOL_ID = "complexity";

export function createComplexityTool(): ToolDefinition {
  return {
    id: COMPLEXITY_TOOL_ID,
    buttonLabel: "Complexity",
    buttonIcon: "✦",
    resolveButtonMount: resolveComplexityButtonMount,
    createController: (context) => new ComplexityController(context)
  };
}

export function resolveComplexityButtonMount(): ToolButtonMount | undefined {
  const anchor = findResultTab();
  if (!anchor?.parentElement) return undefined;
  return {
    anchor,
    strategy: "after",
    isValid: (buttonHost) =>
      buttonHost.parentElement === anchor.parentElement
      && buttonHost.previousElementSibling === anchor
  };
}

export class ComplexityController implements ToolController {
  private state: ViewState = "idle";
  private profiles: ProviderProfile[] = [];
  private activeProfileId = "";
  private problemContext: Awaited<ReturnType<typeof extractProblem>> | undefined;
  private analysis: Analysis | undefined;
  private error = "";
  private requestId: string | undefined;
  private expectedApproachVisible = false;
  private disposed = false;

  constructor(private readonly toolContext: ToolContext) {
    void this.refreshProfiles();
  }

  renderBody(): Node[] {
    const page = this.toolContext.getPageStatus();
    if (page.restricted) {
      return [element(
        "div",
        "error",
        page.reason ?? "Analysis is disabled in this environment."
      )];
    }
    if (this.state === "success" && this.analysis) {
      return this.renderAnalysis(this.analysis);
    }

    const nodes: Node[] = [this.renderMeta(), this.renderControls()];
    if (this.state === "loading") nodes.push(this.renderLoading());
    if (this.state === "error") nodes.push(this.renderError());
    if (this.state === "idle") {
      nodes.push(element(
        "div",
        "notice",
        this.profiles.length
          ? "OpenLeet fetches solution references and sends them with this problem and your current code only when you press Analyse."
          : "Create a provider profile in settings before analysing."
      ));
    }
    return nodes;
  }

  getHeaderActions(): HeaderAction[] {
    return [
      {
        id: "refresh",
        accessibleLabel: "Analyse again",
        icon: "↻",
        visible: this.state === "success",
        onActivate: () => void this.analyse()
      },
      {
        id: "settings",
        accessibleLabel: "Settings",
        icon: "⚙",
        onActivate: () => void this.openOptions()
      }
    ];
  }

  onPageChange(_page: ReturnType<ToolContext["getPageStatus"]>): void {
    this.cancel();
    this.problemContext = undefined;
    this.analysis = undefined;
    this.error = "";
    this.state = "idle";
    this.expectedApproachVisible = false;
    this.invalidate();
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLElement>(
      'button,[role="button"],[data-e2e-locator]'
    );
    if (!control || !isSubmitLabel(control.textContent)) return;
    if (this.state === "loading") this.cancel();
    this.analysis = undefined;
    this.error = "";
    this.state = "idle";
    this.expectedApproachVisible = false;
    this.invalidate();
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
  }

  private async refreshProfiles(): Promise<void> {
    const profiles = await listProfiles();
    const savedProfileId = await getActiveProfileId();
    if (this.disposed) return;
    this.profiles = profiles;
    this.activeProfileId = savedProfileId ?? profiles[0]?.id ?? "";
    if (
      this.activeProfileId
      && !profiles.some((profile) => profile.id === this.activeProfileId)
    ) {
      this.activeProfileId = profiles[0]?.id ?? "";
    }
    this.invalidate();
  }

  private renderMeta(): HTMLElement {
    const page = this.toolContext.getPageStatus();
    const profile = this.profiles.find((item) => item.id === this.activeProfileId);
    const box = element("div", "meta");
    box.append(element(
      "div",
      "problem",
      this.problemContext?.title ?? slugTitle(page.slug ?? "")
    ));
    if (this.problemContext) {
      box.append(element(
        "div",
        "sub",
        `Language: ${this.problemContext.language}`
      ));
    }
    box.append(
      element(
        "div",
        "sub",
        `Provider: ${profile ? providerTypeLabel(profile.type) : "not configured"}`
      ),
      element(
        "div",
        "sub",
        `Model: ${profile?.model ?? "not configured"}`
      )
    );
    return box;
  }

  private renderControls(): HTMLElement {
    const row = element("div", "row");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Provider profile");
    if (!this.profiles.length) {
      const option = document.createElement("option");
      option.textContent = "No profiles configured";
      select.append(option);
    }
    for (const profile of this.profiles) {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      option.selected = profile.id === this.activeProfileId;
      select.append(option);
    }
    select.disabled = this.state === "loading" || !this.profiles.length;
    select.addEventListener("change", () => {
      this.activeProfileId = select.value;
      void setActiveProfileId(this.activeProfileId);
      this.analysis = undefined;
      this.state = "idle";
      this.invalidate();
    });
    const isLoading = this.state === "loading";
    const action = element(
      "button",
      isLoading ? "secondary" : "primary",
      isLoading ? "Cancel" : "Analyse"
    );
    action.disabled = !this.profiles.length;
    action.addEventListener("click", () => {
      if (this.state === "loading") this.cancel();
      else void this.analyse();
    });
    row.append(select, action);
    return row;
  }

  private renderLoading(): HTMLElement {
    const box = element("div", "card");
    const row = element("div", "loading");
    row.append(
      element("span", "spinner"),
      document.createTextNode("Analysing approach and relative complexity…")
    );
    box.append(
      row,
      element(
        "p",
        "",
        "If the problem, language, or code changes, this result will be discarded."
      )
    );
    return box;
  }

  private renderError(): HTMLElement {
    const wrap = element("div", "card");
    wrap.append(element("div", "error", this.error));
    const retry = element("button", "secondary", "Retry");
    retry.addEventListener("click", () => void this.analyse());
    wrap.append(retry);
    return wrap;
  }

  private renderAnalysis(result: Analysis): HTMLElement[] {
    const summary = element("section", "summary-grid");
    const implementationUnknown =
      isUnknownComplexity(result.implementation.time)
      || isUnknownComplexity(result.implementation.space);
    const implementationMatches =
      !implementationUnknown
      && complexitiesMatch(result.recommended.time, result.implementation.time)
      && complexitiesMatch(result.recommended.space, result.implementation.space);
    summary.append(
      this.analysisSummary(
        "Expected",
        result.recommended.approach,
        result.recommended.time.display,
        result.recommended.space.display,
        "expected-summary",
        true
      ),
      this.analysisSummary(
        "Implemented",
        result.implementation.approach,
        result.implementation.time.display,
        result.implementation.space.display,
        implementationUnknown
          ? "implemented-unknown"
          : implementationMatches
            ? "implemented-match"
            : "implemented-mismatch"
      )
    );
    return [
      summary,
      renderGraph(
        "Time complexity growth",
        result.recommended.time,
        result.implementation.time
      ),
      renderGraph(
        "Space complexity growth",
        result.recommended.space,
        result.implementation.space
      )
    ];
  }

  private analysisSummary(
    title: string,
    approach: string,
    time: string,
    space: string,
    className: string,
    hideable = false
  ): HTMLElement {
    const card = element("article", `summary ${className}`);
    const heading = element("div", "summary-heading");
    heading.append(element("h3", "", title));
    const approachRow = element("div");
    approachRow.append(element("h4", "", "Approach"));
    const approachValue = element("p");
    approachRow.append(approachValue);
    if (hideable) {
      const toggle = element("button", "eye-toggle");
      toggle.type = "button";
      const updateApproach = () => {
        const concealed = !this.expectedApproachVisible;
        approachValue.textContent = concealed ? "••••••" : shortApproach(approach);
        approachRow.className = concealed ? "approach-hidden" : "";
        toggle.className = `eye-toggle${concealed ? " concealed" : ""}`;
        toggle.title = concealed
          ? "Reveal expected approach"
          : "Hide expected approach";
        toggle.setAttribute("aria-label", toggle.title);
        toggle.setAttribute("aria-pressed", String(this.expectedApproachVisible));
        toggle.replaceChildren(eyeIcon(concealed));
      };
      toggle.addEventListener("click", () => {
        this.expectedApproachVisible = !this.expectedApproachVisible;
        updateApproach();
      });
      updateApproach();
      heading.append(toggle);
    } else {
      approachValue.textContent = shortApproach(approach);
    }
    card.append(
      heading,
      metric("Time", time),
      metric("Space", space),
      approachRow
    );
    return card;
  }

  private async analyse(): Promise<void> {
    const page = this.toolContext.getPageStatus();
    if (!page.slug || !this.activeProfileId) return;
    const requestedSlug = page.slug;
    const issuedRequestId = crypto.randomUUID();
    this.requestId = issuedRequestId;
    this.expectedApproachVisible = false;
    this.state = "loading";
    this.error = "";
    this.analysis = undefined;
    this.invalidate();
    try {
      const extracted = await extractProblem(requestedSlug);
      if (!this.isActiveRequest(issuedRequestId)) return;
      const reference = await fetchSolutionReferences(requestedSlug);
      if (!this.isActiveRequest(issuedRequestId)) return;
      const liveBeforeRequest = this.currentPageStatus();
      if (
        !liveBeforeRequest.supported
        || liveBeforeRequest.slug !== requestedSlug
      ) {
        throw new Error(
          "The problem changed while loading solution references. The stale request was discarded."
        );
      }
      const requestContext = reference ? { ...extracted, reference } : extracted;
      this.problemContext = requestContext;
      this.invalidate();
      const response = await sendMessage({
        type: "ANALYSE",
        requestId: issuedRequestId,
        profileId: this.activeProfileId,
        context: requestContext
      });
      if (!this.isActiveRequest(issuedRequestId)) return;
      if (response.requestId !== issuedRequestId) return;
      if (!response.ok) throw new Error(response.message);
      const live = this.currentPageStatus();
      if (!live.supported || live.slug !== requestContext.slug) {
        throw new Error(
          "The problem changed during analysis. The stale result was discarded."
        );
      }
      const latest = await extractProblem(live.slug);
      if (!isResponseCurrent(
        issuedRequestId,
        this.requestId,
        response.fingerprint,
        latest.fingerprint,
        requestContext.slug,
        live.slug
      )) {
        throw new Error(
          "The code, language, or problem changed during analysis. The stale result was discarded."
        );
      }
      if (!response.analysis) throw new Error("The provider returned no analysis.");
      this.analysis = response.analysis;
      this.state = "success";
    } catch (caught) {
      if (!this.isActiveRequest(issuedRequestId)) return;
      this.error = caught instanceof Error ? caught.message : "Analysis failed.";
      this.state = "error";
    } finally {
      if (this.requestId === issuedRequestId) {
        this.requestId = undefined;
        this.invalidate();
      }
    }
  }

  private cancel(): void {
    const id = this.requestId;
    this.requestId = undefined;
    if (id) void sendMessage({ type: "CANCEL", requestId: id });
    if (this.state === "loading") {
      this.state = "idle";
      this.error = "";
      this.invalidate();
    }
  }

  private async openOptions(): Promise<void> {
    try {
      const response = await sendMessage({ type: "OPEN_OPTIONS" });
      if (!response.ok) throw new Error(response.message);
    } catch (caught) {
      this.error = caught instanceof Error
        ? caught.message
        : "OpenLeet could not open settings.";
      this.state = "error";
      this.invalidate();
    }
  }

  private currentPageStatus() {
    return this.toolContext.getPageStatus();
  }

  private isActiveRequest(id: string): boolean {
    return this.requestId === id && this.state === "loading";
  }

  private invalidate(): void {
    if (this.disposed) return;
    this.toolContext.invalidateButton();
    this.toolContext.invalidateWindow();
  }
}

function renderGraph(
  title: string,
  expectedComplexity: Analysis["recommended"]["time"],
  implementationComplexity: Analysis["implementation"]["time"]
): HTMLElement {
  const card = element("section", "card graph-card");
  card.append(element("h3", "", title));
  const rawExpected = graphSeries("Expected", expectedComplexity.class);
  const rawUser = graphSeries("Implementation", implementationComplexity.class);
  const implementationUnknown = isUnknownComplexity(implementationComplexity);
  if (!rawExpected.supported || (!rawUser.supported && !implementationUnknown)) {
    card.append(
      element(
        "div",
        "notice",
        [rawExpected.note, rawUser.note].filter(Boolean).join(" ")
      ),
      element(
        "div",
        "graph-note",
        "No coordinates are inferred for unsupported or uncertain classifications."
      )
    );
    return card;
  }
  const normalized = normalizeGraphShapes(
    implementationUnknown ? [rawExpected] : [rawExpected, rawUser]
  );
  const expected = normalized[0];
  const user = normalized[1];
  if (!expected || (!implementationUnknown && !user)) return card;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 300 112");
  svg.setAttribute("class", "graph");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Complexity curves blending normalized shape and relative growth, not execution time or exact magnitude"
  );
  addSvg(svg, "line", {
    x1: "10",
    y1: "8",
    x2: "10",
    y2: "100",
    class: "axis"
  });
  addSvg(svg, "line", {
    x1: "10",
    y1: "100",
    x2: "290",
    y2: "100",
    class: "axis"
  });
  if (user) addSvg(svg, "path", { d: svgPath(user), class: "user" });
  addSvg(svg, "path", { d: svgPath(expected), class: "expected" });
  const legend = element("div", "legend");
  legend.append(legendItem("expected", `Expected · ${expectedComplexity.display}`));
  if (user) {
    legend.append(legendItem(
      "user",
      `Implementation · ${implementationComplexity.display}`
    ));
  }
  card.append(svg, legend);
  if (implementationUnknown) {
    card.append(element(
      "div",
      "graph-note",
      "Implementation complexity is Unknown, so no implementation curve is shown."
    ));
  }
  return card;
}

function findResultTab(): HTMLElement | undefined {
  const semantic = Array.from(
    document.querySelectorAll<HTMLElement>('[role="tab"],button')
  ).find((candidate) => isResultTabLabel(candidate.textContent));
  if (semantic) return semantic;
  return findTextAnchor(isResultTabLabel)
    ?? findTextAnchor((value) => normalizeText(value) === "testcase");
}

function findTextAnchor(
  matches: (value: string | null) => boolean
): HTMLElement | undefined {
  if (!document.body) return undefined;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (matches(node.textContent)) {
      const leaf = node.parentElement;
      if (!leaf || leaf.closest(
        "#openleet-extension-root,[data-openleet-tool-button]"
      )) {
        node = walker.nextNode();
        continue;
      }
      return resolveTabItem(leaf, matches);
    }
    node = walker.nextNode();
  }
  return undefined;
}

function resolveTabItem(
  leaf: HTMLElement,
  matches: (value: string | null) => boolean
): HTMLElement {
  const interactive = leaf.closest<HTMLElement>(
    'button,[role="tab"],[role="button"],a,[tabindex]:not([tabindex="-1"]),[class~="cursor-pointer"]'
  );
  if (interactive && !containsNativeTabPair(interactive.textContent)) {
    return interactive;
  }

  let candidate = leaf;
  for (let depth = 0; depth < 7; depth += 1) {
    const parent = candidate.parentElement;
    if (!parent || parent === document.body) break;
    if (containsNativeTabPair(parent.textContent)) return candidate;
    if (
      !matches(parent.textContent)
      && normalizeText(parent.textContent).length > 40
    ) break;
    candidate = parent;
  }
  return candidate;
}

function sendMessage(message: unknown): Promise<RuntimeResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(
          "The OpenLeet service worker is unavailable. Reload the extension and page."
        ));
      } else {
        resolve(response);
      }
    });
  });
}

function metric(label: string, value: string): HTMLElement {
  const item = element("div", "metric");
  item.append(
    element("h4", "", label),
    element("div", "value", value)
  );
  return item;
}

function legendItem(kind: string, text: string): HTMLElement {
  const item = element("span");
  item.append(
    element("i", `dot ${kind}`),
    document.createTextNode(text)
  );
  return item;
}

function slugTitle(slug: string): string {
  return slug.split("-").map((part) =>
    `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`
  ).join(" ");
}

function providerTypeLabel(type: ProviderProfile["type"]): string {
  const labels: Record<ProviderProfile["type"], string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    custom: "Custom endpoint"
  };
  return labels[type];
}

function eyeIcon(concealed: boolean): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 14");
  svg.setAttribute("aria-hidden", "true");
  addSvg(svg, "path", {
    d: "M1 7s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z"
  });
  addSvg(svg, "circle", { cx: "10", cy: "7", r: "2.4" });
  if (concealed) {
    addSvg(svg, "line", { x1: "2", y1: "1", x2: "18", y2: "13" });
  }
  return svg;
}

function addSvg(
  parent: SVGElement,
  tag: string,
  attributes: Record<string, string>
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) =>
    node.setAttribute(key, value)
  );
  parent.append(node);
  return node;
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

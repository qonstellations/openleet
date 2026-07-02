import { extractProblem } from "./extractor";
import { incompleteCodeMessage } from "./completeness";
import { detectPageStatus, type PageStatus } from "./restrictions";
import { graphSeries, normalizeGraphShapes, svgPath } from "./graph";
import { complexitiesMatch, containsNativeTabPair, isResultTabLabel, isSubmitLabel, normalizeText, shortApproach } from "./presentation";
import { fetchSolutionReferences } from "./references";
import { isResponseCurrent } from "./stale";
import { STYLES } from "./styles";
import { getActiveProfileId, listProfiles, setActiveProfileId } from "../shared/storage";
import type { Analysis, ProviderProfile, RuntimeResponse } from "../shared/schemas";

type ViewState = "idle" | "loading" | "success" | "incomplete" | "error";

const host = document.createElement("div");
host.id = "openleet-extension-root";
const shadow = host.attachShadow({ mode: "closed" });
const style = document.createElement("style");
style.textContent = STYLES;
shadow.append(style);
const root = document.createElement("div");
shadow.append(root);
document.documentElement.append(host);

const tabHost = document.createElement("span");
tabHost.id = "openleet-result-tab";
const tabShadow = tabHost.attachShadow({ mode: "closed" });
const tabStyle = document.createElement("style");
tabStyle.textContent = STYLES;
tabShadow.append(tabStyle);
const tabRoot = document.createElement("span");
tabShadow.append(tabRoot);
for (const eventName of ["click", "mousedown", "pointerdown"]) {
  tabHost.addEventListener(eventName, (event) => event.stopPropagation());
}
injectBridge();

let currentUrl = location.href;
let page = pageStatus();
let open = false;
let expectedApproachVisible = false;
let state: ViewState = "idle";
let profiles: ProviderProfile[] = [];
let activeProfileId = "";
let context: Awaited<ReturnType<typeof extractProblem>> | undefined;
let analysis: Analysis | undefined;
let error = "";
let requestId: string | undefined;

void refreshProfiles();
render();

const observer = new MutationObserver(() => {
  if (!host.isConnected) document.documentElement.append(host);
  scheduleResultTabSync();
  if (currentUrl !== location.href) onNavigation();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", onNavigation);
document.addEventListener("click", onDocumentClick, true);
scheduleResultTabSync();

function pageStatus(): PageStatus {
  return detectPageStatus(new URL(location.href), document.body?.innerText ?? "");
}

function onNavigation() {
  if (currentUrl === location.href) return;
  currentUrl = location.href;
  cancel();
  page = pageStatus();
  context = undefined;
  analysis = undefined;
  error = "";
  state = "idle";
  open = false;
  expectedApproachVisible = false;
  tabHost.remove();
  render();
  scheduleResultTabSync();
}

async function refreshProfiles() {
  profiles = await listProfiles();
  activeProfileId = (await getActiveProfileId()) ?? profiles[0]?.id ?? "";
  if (activeProfileId && !profiles.some((profile) => profile.id === activeProfileId)) {
    activeProfileId = profiles[0]?.id ?? "";
  }
  render();
}

function render() {
  root.replaceChildren();
  if (!page.supported && !page.restricted) return;
  renderResultTab();
  if (!open) return;
  const panel = el("section", "panel");
  panel.setAttribute("aria-label", "OpenLeet analysis");
  panel.append(renderHeader());
  const body = el("div", "body");
  if (page.restricted) {
    body.append(el("div", "error", page.reason ?? "Analysis is disabled in this environment."));
  } else if (state === "success" && analysis) {
    body.append(...renderAnalysis(analysis));
  } else {
    body.append(renderMeta(), renderControls());
    if (state === "loading") body.append(renderLoading());
    if (state === "incomplete") body.append(renderIncomplete());
    if (state === "error") body.append(renderError());
    if (state === "idle") body.append(el("div", "notice", profiles.length ? "OpenLeet fetches solution references and sends them with this problem and your current code only when you press Analyse." : "Create a provider profile in settings before analysing."));
  }
  panel.append(body);
  root.append(panel);
}

function renderHeader(): HTMLElement {
  const header = el("header", "header");
  const brand = el("div", "brand");
  brand.append(document.createTextNode("Open"), el("span", "mark", "Leet"));
  const actions = el("div", "header-actions");
  if (state === "success") {
    const refresh = el("button", "icon", "↻");
    refresh.title = "Analyse again";
    refresh.addEventListener("click", () => void analyse());
    actions.append(refresh);
  }
  const settings = el("button", "icon", "⚙");
  settings.title = "Settings";
  settings.addEventListener("click", () => void openOptions());
  const close = el("button", "icon", "×");
  close.title = "Close";
  close.addEventListener("click", () => { open = false; render(); });
  actions.append(settings, close);
  header.append(brand, actions);
  return header;
}

function renderMeta(): HTMLElement {
  const profile = profiles.find((item) => item.id === activeProfileId);
  const box = el("div", "meta");
  box.append(
    el("div", "problem", context?.title ?? slugTitle(page.slug ?? "")),
    el("div", "sub", `Language: ${context?.language ?? "detected when analysed"}`),
    el("div", "sub", `Provider: ${profile ? `${profile.name} · ${profile.model}` : "not configured"}`)
  );
  return box;
}

function renderControls(): HTMLElement {
  const row = el("div", "row");
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Provider profile");
  if (!profiles.length) {
    const option = document.createElement("option");
    option.textContent = "No profiles configured";
    select.append(option);
  }
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = `${profile.name} · ${profile.model}`;
    option.selected = profile.id === activeProfileId;
    select.append(option);
  }
  select.disabled = state === "loading" || !profiles.length;
  select.addEventListener("change", () => {
    activeProfileId = select.value;
    void setActiveProfileId(activeProfileId);
    analysis = undefined; state = "idle"; render();
  });
  const action = el("button", state === "loading" ? "secondary" : "primary", state === "loading" ? "Cancel" : "Analyse");
  (action as HTMLButtonElement).disabled = !profiles.length;
  action.addEventListener("click", () => state === "loading" ? cancel() : void analyse());
  row.append(select, action);
  return row;
}

function renderLoading(): HTMLElement {
  const box = el("div", "card");
  const row = el("div", "loading");
  row.append(el("span", "spinner"), document.createTextNode("Analysing approach and relative complexity…"));
  box.append(row, el("p", "", "If the problem, language, or code changes, this result will be discarded."));
  return box;
}

function renderError(): HTMLElement {
  const wrap = el("div", "card");
  wrap.append(el("div", "error", error));
  const retry = el("button", "secondary", "Retry");
  retry.addEventListener("click", () => void analyse());
  wrap.append(retry);
  return wrap;
}

function renderIncomplete(): HTMLElement {
  return el("div", "incomplete", error || "Incomplete code. Finish the implementation before analysing complexity.");
}

function renderAnalysis(result: Analysis): HTMLElement[] {
  const summary = el("section", "summary-grid");
  const implementationMatches = complexitiesMatch(result.recommended.time, result.implementation.time) &&
    complexitiesMatch(result.recommended.space, result.implementation.space);
  summary.append(
    analysisSummary("Expected", result.recommended.approach, result.recommended.time.display, result.recommended.space.display, "expected-summary", true),
    analysisSummary(
      "Implemented",
      result.implementation.approach,
      result.implementation.time.display,
      result.implementation.space.display,
      implementationMatches ? "implemented-match" : "implemented-mismatch"
    )
  );
  return [
    summary,
    renderGraph("Time complexity growth", result.recommended.time, result.implementation.time),
    renderGraph("Space complexity growth", result.recommended.space, result.implementation.space)
  ];
}

function analysisSummary(title: string, approach: string, time: string, space: string, className: string, hideable = false): HTMLElement {
  const card = el("article", `summary ${className}`);
  const heading = el("div", "summary-heading");
  heading.append(el("h3", "", title));
  const approachRow = el("div");
  approachRow.append(el("h4", "", "Approach"));
  const approachValue = el("p");
  approachRow.append(approachValue);
  if (hideable) {
    const toggle = el("button", "eye-toggle");
    toggle.type = "button";
    const updateApproach = () => {
      const concealed = !expectedApproachVisible;
      approachValue.textContent = concealed ? "••••••" : shortApproach(approach);
      approachRow.className = concealed ? "approach-hidden" : "";
      toggle.className = `eye-toggle${concealed ? " concealed" : ""}`;
      toggle.title = concealed ? "Reveal expected approach" : "Hide expected approach";
      toggle.setAttribute("aria-label", toggle.title);
      toggle.setAttribute("aria-pressed", String(expectedApproachVisible));
      toggle.replaceChildren(eyeIcon(concealed));
    };
    toggle.addEventListener("click", () => {
      expectedApproachVisible = !expectedApproachVisible;
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

function renderGraph(
  title: string,
  expectedComplexity: Analysis["recommended"]["time"],
  implementationComplexity: Analysis["implementation"]["time"]
): HTMLElement {
  const card = el("section", "card graph-card");
  card.append(el("h3", "", title));
  const rawExpected = graphSeries("Expected", expectedComplexity.class);
  const rawUser = graphSeries("Implementation", implementationComplexity.class);
  if (!rawExpected.supported || !rawUser.supported) {
    card.append(el("div", "notice", [rawExpected.note, rawUser.note].filter(Boolean).join(" ")), el("div", "graph-note", "No coordinates are inferred for unsupported or uncertain classifications."));
    return card;
  }
  const [expected, user] = normalizeGraphShapes([rawExpected, rawUser]);
  if (!expected || !user) return card;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 300 112");
  svg.setAttribute("class", "graph");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Independently normalized complexity curve shapes, not execution time or magnitude");
  addSvg(svg, "line", { x1: "10", y1: "8", x2: "10", y2: "100", class: "axis" });
  addSvg(svg, "line", { x1: "10", y1: "100", x2: "290", y2: "100", class: "axis" });
  addSvg(svg, "path", { d: svgPath(user), class: "user" });
  addSvg(svg, "path", { d: svgPath(expected), class: "expected" });
  const legend = el("div", "legend");
  legend.append(legendItem("expected", `Expected · ${expectedComplexity.display}`), legendItem("user", `Implementation · ${implementationComplexity.display}`));
  card.append(svg, legend);
  return card;
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest<HTMLElement>('button,[role="button"],[data-e2e-locator]');
  if (!control || !isSubmitLabel(control.textContent)) return;
  if (state === "loading") cancel();
  analysis = undefined;
  error = "";
  state = "idle";
  expectedApproachVisible = false;
  render();
  scheduleResultTabSync();
}

let resultTabSyncScheduled = false;

function scheduleResultTabSync() {
  if (resultTabSyncScheduled) return;
  resultTabSyncScheduled = true;
  queueMicrotask(() => {
    resultTabSyncScheduled = false;
    syncResultTab();
  });
}

function syncResultTab() {
  if (!page.supported || page.restricted) {
    tabHost.remove();
    return;
  }
  const anchor = findResultTab();
  const parent = anchor?.parentElement;
  if (!anchor || !parent) return;
  if (tabHost.parentElement !== parent || tabHost.previousElementSibling !== anchor) {
    anchor.insertAdjacentElement("afterend", tabHost);
  }
  renderResultTab();
}

function findResultTab(): HTMLElement | undefined {
  const semantic = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"],button'))
    .find((candidate) => isResultTabLabel(candidate.textContent));
  if (semantic) return semantic;

  return findTextAnchor(isResultTabLabel) ?? findTextAnchor((value) => normalizeText(value) === "testcase");
}

function findTextAnchor(matches: (value: string | null) => boolean): HTMLElement | undefined {
  if (!document.body) return undefined;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (matches(node.textContent)) {
      const leaf = node.parentElement;
      if (!leaf || leaf.closest("#openleet-extension-root,#openleet-result-tab")) {
        node = walker.nextNode();
        continue;
      }
      return resolveTabItem(leaf, matches);
    }
    node = walker.nextNode();
  }
  return undefined;
}

function resolveTabItem(leaf: HTMLElement, matches: (value: string | null) => boolean): HTMLElement {
  const interactive = leaf.closest<HTMLElement>(
    'button,[role="tab"],[role="button"],a,[tabindex]:not([tabindex="-1"]),[class~="cursor-pointer"]'
  );
  if (interactive && !containsNativeTabPair(interactive.textContent)) return interactive;

  let candidate = leaf;
  for (let depth = 0; depth < 7; depth += 1) {
    const parent = candidate.parentElement;
    if (!parent || parent === document.body) break;
    if (containsNativeTabPair(parent.textContent)) return candidate;
    if (!matches(parent.textContent) && normalizeText(parent.textContent).length > 40) break;
    candidate = parent;
  }
  return candidate;
}

function renderResultTab() {
  tabRoot.replaceChildren();
  if (!page.supported || page.restricted) return;
  const label = state === "loading" ? "Analysing…" : state === "success" ? "Complexity" : state === "incomplete" ? "Incomplete" : "OpenLeet";
  const button = el("button", `result-tab${open ? " active" : ""}`);
  button.type = "button";
  button.append(el("span", "sparkle", "✦"), document.createTextNode(label));
  button.title = "Analyse time and space complexity with OpenLeet";
  button.addEventListener("click", () => {
    open = !open;
    render();
  });
  tabRoot.append(button);
}

async function analyse() {
  if (!page.slug || !activeProfileId) return;
  const requestedSlug = page.slug;
  const issuedRequestId = crypto.randomUUID();
  requestId = issuedRequestId;
  expectedApproachVisible = false;
  state = "loading"; error = ""; analysis = undefined; render();
  try {
    const extracted = await extractProblem(requestedSlug);
    if (requestId !== issuedRequestId || state !== "loading") return;
    const incomplete = incompleteCodeMessage(extracted.code, extracted.language);
    if (incomplete) {
      context = extracted;
      error = incomplete;
      state = "incomplete";
      return;
    }
    const reference = await fetchSolutionReferences(requestedSlug);
    if (requestId !== issuedRequestId || state !== "loading") return;
    const liveBeforeRequest = pageStatus();
    if (!liveBeforeRequest.supported || liveBeforeRequest.slug !== requestedSlug) {
      throw new Error("The problem changed while loading solution references. The stale request was discarded.");
    }
    const requestContext = reference ? { ...extracted, reference } : extracted;
    context = requestContext;
    render();
    const response = await sendMessage({
      type: "ANALYSE", requestId: issuedRequestId, profileId: activeProfileId, context: requestContext
    });
    if (requestId !== issuedRequestId || state !== "loading") return;
    if (response.requestId !== issuedRequestId) return;
    if (!response.ok) throw new Error(response.message);
    const live = pageStatus();
    if (!live.supported || live.slug !== requestContext.slug) throw new Error("The problem changed during analysis. The stale result was discarded.");
    const latest = await extractProblem(live.slug);
    if (!isResponseCurrent(issuedRequestId, requestId, response.fingerprint, latest.fingerprint, requestContext.slug, live.slug)) {
      throw new Error("The code, language, or problem changed during analysis. The stale result was discarded.");
    }
    if (!response.analysis) throw new Error("The provider returned no analysis.");
    analysis = response.analysis;
    state = "success";
  } catch (caught) {
    if (requestId !== issuedRequestId || state !== "loading") return;
    error = caught instanceof Error ? caught.message : "Analysis failed.";
    state = "error";
  } finally {
    if (requestId === issuedRequestId) {
      requestId = undefined;
      render();
    }
  }
}

function cancel() {
  const id = requestId;
  requestId = undefined;
  if (id) void sendMessage({ type: "CANCEL", requestId: id });
  if (state === "loading") { state = "idle"; error = ""; render(); }
}

async function openOptions() {
  try {
    const response = await sendMessage({ type: "OPEN_OPTIONS" });
    if (!response.ok) throw new Error(response.message);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "OpenLeet could not open settings.";
    state = "error";
    render();
  }
}

function sendMessage(message: unknown): Promise<RuntimeResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) reject(new Error("The OpenLeet service worker is unavailable. Reload the extension and page."));
      else resolve(response);
    });
  });
}

function injectBridge() {
  if (document.querySelector('script[data-openleet-bridge]')) return;
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.dataset.openleetBridge = "true";
  script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function metric(label: string, value: string) { const item = el("div", "metric"); item.append(el("h4", "", label), el("div", "value", value)); return item; }
function legendItem(kind: string, text: string) { const item = el("span"); item.append(el("i", `dot ${kind}`), document.createTextNode(text)); return item; }
function slugTitle(slug: string) { return slug.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" "); }
function eyeIcon(concealed: boolean): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 14");
  svg.setAttribute("aria-hidden", "true");
  addSvg(svg, "path", { d: "M1 7s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" });
  addSvg(svg, "circle", { cx: "10", cy: "7", r: "2.4" });
  if (concealed) addSvg(svg, "line", { x1: "2", y1: "1", x2: "18", y2: "13" });
  return svg;
}
function addSvg(parent: SVGElement, tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  parent.append(node); return node;
}

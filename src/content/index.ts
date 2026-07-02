import { extractProblem } from "./extractor";
import { detectPageStatus, type PageStatus } from "./restrictions";
import { graphSeries, svgPath } from "./graph";
import { isResponseCurrent } from "./stale";
import { STYLES } from "./styles";
import { getActiveProfileId, listProfiles, setActiveProfileId } from "../shared/storage";
import type { Analysis, ProviderProfile, RuntimeResponse } from "../shared/schemas";

type ViewState = "idle" | "loading" | "success" | "error";

const host = document.createElement("div");
host.id = "openleet-extension-root";
const shadow = host.attachShadow({ mode: "closed" });
const style = document.createElement("style");
style.textContent = STYLES;
shadow.append(style);
const root = document.createElement("div");
shadow.append(root);
document.documentElement.append(host);
injectBridge();

let currentUrl = location.href;
let page = pageStatus();
let open = false;
let collapsed = false;
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
  if (currentUrl !== location.href) onNavigation();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", onNavigation);

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
  render();
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
  if (!open) {
    const button = el("button", "launcher", page.restricted ? "OpenLeet unavailable" : "Analyse with OpenLeet");
    button.addEventListener("click", () => { open = true; render(); });
    root.append(button);
    return;
  }
  const panel = el("section", `panel${collapsed ? " collapsed" : ""}`);
  panel.setAttribute("aria-label", "OpenLeet analysis");
  panel.append(renderHeader());
  const body = el("div", "body");
  if (page.restricted) {
    body.append(el("div", "error", page.reason ?? "Analysis is disabled in this environment."));
  } else {
    body.append(renderMeta(), renderControls());
    if (state === "loading") body.append(renderLoading());
    if (state === "error") body.append(renderError());
    if (state === "success" && analysis) body.append(...renderAnalysis(analysis));
    if (state === "idle") body.append(el("div", "notice", profiles.length ? "OpenLeet sends this problem and your current code only when you press Analyse." : "Create a provider profile in settings before analysing."));
  }
  body.append(el("div", "footer", "No chat, code generation, history, analytics, or telemetry."));
  panel.append(body);
  root.append(panel);
}

function renderHeader(): HTMLElement {
  const header = el("header", "header");
  const brand = el("div", "brand");
  brand.append(document.createTextNode("Open"), el("span", "mark", "Leet"));
  const actions = el("div", "header-actions");
  const settings = el("button", "icon", "⚙");
  settings.title = "Settings";
  settings.addEventListener("click", () => chrome.runtime.openOptionsPage());
  const collapse = el("button", "icon", collapsed ? "□" : "—");
  collapse.title = collapsed ? "Expand" : "Collapse";
  collapse.addEventListener("click", () => { collapsed = !collapsed; render(); });
  const close = el("button", "icon", "×");
  close.title = "Close";
  close.addEventListener("click", () => { open = false; render(); });
  actions.append(settings, collapse, close);
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

function renderAnalysis(result: Analysis): HTMLElement[] {
  const recommended = analysisCard("Recommended approach", result.recommended.approach, result.recommended.time.display, result.recommended.space.display, result.recommended.time.explanation, result.recommended.space.explanation);
  const implementation = analysisCard("Your approach", result.implementation.approach, result.implementation.time.display, result.implementation.space.display, result.implementation.time.explanation, result.implementation.space.explanation);
  const comparison = el("section", "card");
  comparison.append(el("h3", "", "Comparison"), el("span", "badge", result.comparison.verdict.replaceAll("_", " ")), el("p", "", result.comparison.summary), labelled("Most important difference", result.comparison.mostImportantDifference));
  if (result.uncertainty) comparison.append(labelled("Uncertainty", result.uncertainty));
  comparison.append(el("div", "sub", `Confidence: ${result.confidence}`));
  return [recommended, implementation, comparison, renderGraph(result)];
}

function analysisCard(title: string, approach: string, time: string, space: string, timeReason: string, spaceReason: string): HTMLElement {
  const card = el("section", "card");
  const metrics = el("div", "metrics");
  metrics.append(metric("Time", time), metric("Space", space));
  card.append(el("h3", "", title), el("p", "", approach), metrics, labelled("Time derivation", timeReason), labelled("Space derivation", spaceReason));
  return card;
}

function renderGraph(result: Analysis): HTMLElement {
  const card = el("section", "card");
  card.append(el("h3", "", "Relative time-complexity growth"));
  const expected = graphSeries("Expected", result.recommended.time.class);
  const user = graphSeries("Implementation", result.implementation.time.class);
  if (!expected.supported || !user.supported) {
    card.append(el("div", "notice", [expected.note, user.note].filter(Boolean).join(" ")), el("div", "graph-note", "No coordinates are inferred for unsupported or uncertain classifications."));
    return card;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 300 170");
  svg.setAttribute("class", "graph");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Normalized relative growth curves, not execution time");
  addSvg(svg, "line", { x1: "10", y1: "10", x2: "10", y2: "150", class: "axis" });
  addSvg(svg, "line", { x1: "10", y1: "150", x2: "290", y2: "150", class: "axis" });
  addSvg(svg, "path", { d: svgPath(expected), class: "expected" });
  addSvg(svg, "path", { d: svgPath(user), class: "user" });
  const xLabel = addSvg(svg, "text", { x: "176", y: "165", fill: "#7f8ca2", "font-size": "9" });
  xLabel.textContent = "normalized input size →";
  const legend = el("div", "legend");
  legend.append(legendItem("expected", `Expected · ${result.recommended.time.display}`), legendItem("user", `Implementation · ${result.implementation.time.display}`));
  card.append(svg, legend, el("div", "graph-note", "Curves show normalized relative growth only—not runtime, benchmarks, or comparable constants."));
  return card;
}

async function analyse() {
  if (!page.slug || !activeProfileId) return;
  state = "loading"; error = ""; analysis = undefined; render();
  try {
    context = await extractProblem(page.slug);
    requestId = crypto.randomUUID();
    render();
    const issuedRequestId = requestId;
    const response = await sendMessage({
      type: "ANALYSE", requestId: issuedRequestId, profileId: activeProfileId, context
    });
    if (response.requestId !== issuedRequestId) return;
    if (!response.ok) throw new Error(response.message);
    const live = pageStatus();
    if (!live.supported || live.slug !== context.slug) throw new Error("The problem changed during analysis. The stale result was discarded.");
    const latest = await extractProblem(live.slug);
    if (!isResponseCurrent(issuedRequestId, requestId, response.fingerprint, latest.fingerprint, context.slug, live.slug)) {
      throw new Error("The code, language, or problem changed during analysis. The stale result was discarded.");
    }
    if (!response.analysis) throw new Error("The provider returned no analysis.");
    analysis = response.analysis;
    state = "success";
  } catch (caught) {
    if (state !== "loading") return;
    error = caught instanceof Error ? caught.message : "Analysis failed.";
    state = "error";
  } finally {
    requestId = undefined;
    render();
  }
}

function cancel() {
  const id = requestId;
  requestId = undefined;
  if (id) void sendMessage({ type: "CANCEL", requestId: id });
  if (state === "loading") { state = "idle"; error = ""; render(); }
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
function labelled(label: string, value: string) { const item = el("div"); item.append(el("h4", "", label), el("p", "", value)); return item; }
function legendItem(kind: string, text: string) { const item = el("span"); item.append(el("i", `dot ${kind}`), document.createTextNode(text)); return item; }
function slugTitle(slug: string) { return slug.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" "); }
function addSvg(parent: SVGElement, tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  parent.append(node); return node;
}

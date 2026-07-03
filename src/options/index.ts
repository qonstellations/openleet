import { DEFAULT_ENDPOINTS, PERSISTENT_KEY_WARNING } from "../shared/defaults";
import { endpointOrigin, isLocalEndpoint, normalizeEndpoint } from "../shared/endpoint";
import { ProfileSchema, type ProviderProfile, type ProviderType, type RuntimeResponse } from "../shared/schemas";
import { getActiveProfileId, getApiKey, listProfiles, removeApiKey, saveApiKey, saveProfiles, setActiveProfileId } from "../shared/storage";
import { ZodError } from "zod";

const app = document.querySelector<HTMLDivElement>("#app")!;
let profiles: ProviderProfile[] = [];
let selectedId = "";
let feedback: Feedback | undefined;

interface Feedback {
  tone: "success" | "progress" | "error";
  title: string;
  detail: string;
}

void load();

async function load() {
  profiles = await listProfiles();
  selectedId = profiles[0]?.id ?? "";
  render();
}

function render() {
  app.replaceChildren();
  const shell = el("main", "shell");
  const header = el("header", "top");
  const title = el("div", "title-block");
  const heading = el("h1");
  heading.append(
    document.createTextNode("Open"),
    el("span", "mark", "Leet"),
    document.createTextNode(" settings")
  );
  title.append(
    el("div", "eyebrow", "Provider configuration"),
    heading,
    el(
      "p",
      "muted",
      "Manage provider connections and credential storage. API keys are never exposed to the LeetCode page."
    )
  );
  const add = button("New profile", "primary", () => {
    selectedId = "";
    feedback = undefined;
    render();
  });
  header.append(title, add);
  const layout = el("div", "layout");
  layout.append(renderList(), renderForm());
  shell.append(header, layout, renderPrivacy());
  app.append(style(), shell);
}

function renderList(): HTMLElement {
  const aside = el("aside", "sidebar");
  const heading = el("div", "section-heading");
  heading.append(
    el("h2", "", "Profiles"),
    el("span", "count", String(profiles.length))
  );
  aside.append(heading);
  if (!profiles.length) aside.append(el("p", "muted", "No provider profiles yet."));
  for (const profile of profiles) {
    const item = button("", `profile ${profile.id === selectedId ? "active" : ""}`, () => {
      selectedId = profile.id;
      feedback = undefined;
      render();
    });
    const local = isLocalEndpoint(profile.endpoint) ? " · Local" : "";
    item.append(
      el("strong", "", profile.name),
      el("span", "", `${providerTypeLabel(profile.type)} · ${profile.model}${local}`)
    );
    aside.append(item);
  }
  return aside;
}

function renderForm(): HTMLElement {
  const existing = profiles.find((profile) => profile.id === selectedId);
  const form = el("form", "form") as HTMLFormElement;
  form.addEventListener("submit", (event) => { event.preventDefault(); void save(form, existing); });
  const heading = el("div", "form-heading");
  heading.append(
    el("h2", "", existing ? "Edit provider" : "Create provider"),
    el(
      "p",
      "muted",
      existing
        ? "Update this connection, model, and credential policy."
        : "Add an AI provider for OpenLeet analysis."
    )
  );
  form.append(heading);
  if (feedback) form.append(renderFeedback(feedback));
  const fields = el("div", "form-grid");
  fields.append(
    field("Profile name", input("name", existing?.name ?? "", "e.g. Local Ollama")),
    field("Provider type", providerSelect(existing?.type ?? "openai")),
    field("Endpoint", input("endpoint", existing?.endpoint ?? DEFAULT_ENDPOINTS.openai, "https://…"), "wide"),
    field("Model", input("model", existing?.model ?? "", "e.g. gpt-4.1-mini")),
    field("Request timeout (seconds)", input("timeout", String((existing?.timeoutMs ?? 60_000) / 1000), "60", "number")),
    field("API key", secretInput(existing), "wide"),
    storageField(existing?.keyStorage ?? "session")
  );
  form.append(
    fields,
    el(
      "p",
      "help",
      "Leave the API key blank to retain the currently stored key. Custom and local endpoints may not require authentication."
    )
  );
  const actions = el("div", "actions");
  actions.append(button(existing ? "Save changes" : "Create profile", "primary", undefined, "submit"));
  if (existing) {
    actions.append(
      button("Test profile", "secondary", () => void testProfile(form, existing)),
      button("Remove key", "secondary", () => void removeKey(existing)),
      button("Delete profile", "danger", () => void deleteProfile(existing))
    );
  }
  form.append(actions);
  return form;
}

function providerSelect(value: ProviderType): HTMLSelectElement {
  const select = document.createElement("select");
  select.name = "type";
  for (const type of ["openai", "anthropic", "gemini", "custom"] as const) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type === "custom" ? "Custom OpenAI-compatible" : type[0]!.toUpperCase() + type.slice(1);
    option.selected = type === value;
    select.append(option);
  }
  select.addEventListener("change", () => {
    const endpoint = document.querySelector<HTMLInputElement>('input[name="endpoint"]');
    if (endpoint) endpoint.value = DEFAULT_ENDPOINTS[select.value as ProviderType];
  });
  return select;
}

function secretInput(existing?: ProviderProfile): HTMLInputElement {
  const node = input("apiKey", "", existing ? "Blank keeps current key" : "Provider API key", "password");
  node.autocomplete = "new-password";
  return node;
}

function storageField(value: "session" | "persistent"): HTMLElement {
  const wrap = el("fieldset", "storage wide");
  wrap.append(el("legend", "", "API-key storage"));
  wrap.append(el(
    "p",
    "storage-intro",
    "Choose how long OpenLeet may retain this profile's API key."
  ));
  const warning = el("div", "warning");
  warning.append(
    el("strong", "", "Persistent credential storage"),
    el("p", "", PERSISTENT_KEY_WARNING)
  );
  warning.hidden = value !== "persistent";
  const showPersistentWarning = (visible: boolean) => {
    warning.hidden = !visible;
  };
  wrap.append(
    radio(
      "persistent",
      "Remember in this Chrome profile",
      "Available after Chrome restarts and retained until you remove it.",
      value === "persistent",
      () => showPersistentWarning(true)
    ),
    radio(
      "session",
      "Keep until Chrome closes",
      "Cleared when Chrome's extension session ends.",
      value === "session",
      () => showPersistentWarning(false)
    ),
    warning
  );
  return wrap;
}

function radio(
  value: string,
  label: string,
  description: string,
  checked: boolean,
  onSelect: () => void
): HTMLElement {
  const line = el("label", "radio");
  const node = document.createElement("input");
  node.type = "radio"; node.name = "keyStorage"; node.value = value; node.checked = checked;
  node.addEventListener("change", () => {
    if (node.checked) onSelect();
  });
  const copy = el("span", "radio-copy");
  copy.append(el("strong", "", label), el("span", "", description));
  line.append(node, copy);
  return line;
}

async function profileFrom(form: HTMLFormElement, existing?: ProviderProfile): Promise<{ profile: ProviderProfile; key: string }> {
  const data = new FormData(form);
  const profile = ProfileSchema.parse({
    id: existing?.id ?? crypto.randomUUID(),
    name: data.get("name"),
    type: data.get("type"),
    endpoint: normalizeEndpoint(String(data.get("endpoint") ?? "")),
    model: data.get("model"),
    timeoutMs: Number(data.get("timeout")) * 1000,
    keyStorage: data.get("keyStorage")
  });
  return { profile, key: String(data.get("apiKey") ?? "").trim() };
}

async function save(form: HTMLFormElement, existing?: ProviderProfile) {
  try {
    const { profile, key } = await profileFrom(form, existing);
    if (profile.keyStorage === "persistent" && (key || existing?.keyStorage !== "persistent")) {
      if (!confirmPersistentStorage()) return;
    }
    await ensurePermission(profile.endpoint);
    const previousKey = existing ? await getApiKey(existing) : undefined;
    const next = existing ? profiles.map((item) => item.id === profile.id ? profile : item) : [...profiles, profile];
    await saveProfiles(next);
    if (key) await saveApiKey(profile, key);
    else if (previousKey && existing?.keyStorage !== profile.keyStorage) await saveApiKey(profile, previousKey);
    profiles = next; selectedId = profile.id;
    if (!(await getActiveProfileId())) await setActiveProfileId(profile.id);
    feedback = {
      tone: "success",
      title: "Profile saved",
      detail: `“${profile.name}” is configured and ready to use.`
    };
    render();
  } catch (caught) {
    feedback = failureFeedback("Profile not saved", caught);
    render();
  }
}

async function testProfile(form: HTMLFormElement, existing: ProviderProfile) {
  try {
    const parsed = await profileFrom(form, existing);
    if (
      parsed.profile.keyStorage === "persistent"
      && (parsed.key || existing.keyStorage !== "persistent")
      && !confirmPersistentStorage()
    ) return;
    await ensurePermission(parsed.profile.endpoint);
    const oldKey = await getApiKey(existing);
    profiles = profiles.map((item) => item.id === existing.id ? parsed.profile : item);
    await saveProfiles(profiles);
    if (parsed.key) await saveApiKey(parsed.profile, parsed.key);
    else if (oldKey && existing.keyStorage !== parsed.profile.keyStorage) await saveApiKey(parsed.profile, oldKey);
    feedback = {
      tone: "progress",
      title: "Verifying connection",
      detail: `Checking endpoint access and model availability for “${parsed.profile.name}”…`
    };
    render();
    const response = await sendMessage({ type: "TEST_PROFILE", profileId: parsed.profile.id });
    if (!response.ok) throw new Error(response.message);
    feedback = {
      tone: "success",
      title: "Connection verified",
      detail: response.message ?? `“${parsed.profile.name}” responded successfully.`
    };
    render();
  } catch (caught) {
    feedback = failureFeedback("Connection verification failed", caught);
    render();
  }
}

async function removeKey(profile: ProviderProfile) {
  try {
    await removeApiKey(profile.id);
    feedback = {
      tone: "success",
      title: "API key removed",
      detail: `Stored credentials for “${profile.name}” were removed from session and persistent storage.`
    };
  } catch (caught) {
    feedback = failureFeedback("API key not removed", caught);
  }
  render();
}

async function deleteProfile(profile: ProviderProfile) {
  if (!window.confirm(
    `Delete “${profile.name}”?\n\nThis removes the provider profile and its stored API key. This action cannot be undone.`
  )) return;
  try {
    await removeApiKey(profile.id);
    profiles = profiles.filter((item) => item.id !== profile.id);
    await saveProfiles(profiles);
    if ((await getActiveProfileId()) === profile.id && profiles[0]) {
      await setActiveProfileId(profiles[0].id);
    }
    selectedId = profiles[0]?.id ?? "";
    feedback = {
      tone: "success",
      title: "Profile deleted",
      detail: `“${profile.name}” and its stored credentials were removed.`
    };
  } catch (caught) {
    feedback = failureFeedback("Profile not deleted", caught);
  }
  render();
}

async function ensurePermission(endpoint: string) {
  const origins = [endpointOrigin(endpoint)];
  if (await chrome.permissions.contains({ origins })) return;
  if (!(await chrome.permissions.request({ origins }))) throw new Error("Endpoint permission was not granted. OpenLeet cannot contact this provider.");
}

function sendMessage(message: unknown): Promise<RuntimeResponse> {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, (response: RuntimeResponse) => {
    if (chrome.runtime.lastError) {
      reject(new Error(
        "OpenLeet is currently unavailable. Reload the extension and try again."
      ));
    }
    else resolve(response);
  }));
}

function renderFeedback(value: Feedback): HTMLElement {
  const banner = el("div", `feedback ${value.tone}`);
  banner.setAttribute("role", value.tone === "error" ? "alert" : "status");
  const icon = value.tone === "success"
    ? "✓"
    : value.tone === "error"
      ? "!"
      : "…";
  const copy = el("div", "feedback-copy");
  copy.append(
    el("strong", "", value.title),
    el("span", "", value.detail)
  );
  banner.append(el("span", "feedback-icon", icon), copy);
  return banner;
}

function failureFeedback(title: string, value: unknown): Feedback {
  return {
    tone: "error",
    title,
    detail: messageOf(value)
  };
}

function confirmPersistentStorage(): boolean {
  return window.confirm(
    `Store this API key in your Chrome profile?\n\n${PERSISTENT_KEY_WARNING}`
  );
}

function renderPrivacy(): HTMLElement {
  const section = el("section", "privacy");
  const heading = el("div", "privacy-heading");
  const headingCopy = el("div");
  headingCopy.append(
    el("h2", "", "Privacy and security"),
    el(
      "p",
      "muted",
      "OpenLeet is a client-side extension. It has no account system, hosted inference service, analytics, telemetry, or cloud analysis history."
    )
  );
  heading.append(el("div", "privacy-icon", "✦"), headingCopy);
  const grid = el("div", "privacy-grid");
  grid.append(
    privacyItem(
      "Data sent for analysis",
      "When you select Analyse, the current problem, editor code, and limited solution-reference excerpts are sent only to your selected provider. That provider processes the request under its own privacy and retention terms."
    ),
    privacyItem(
      "Credential handling",
      "API keys are stored separately from provider profiles and are read only by extension pages and the service worker. They are not inserted into the LeetCode page, URLs, telemetry, or analysis history."
    ),
    privacyItem(
      "Local and custom endpoints",
      "Requests to a loopback endpoint remain between the extension and that local service. OpenLeet still retrieves problem and reference material from LeetCode, and non-loopback HTTP endpoints do not provide transport confidentiality."
    )
  );
  const recommendation = el("div", "security-note");
  recommendation.append(
    el("strong", "", "Security recommendation"),
    document.createTextNode(
      " Use a dedicated provider key with minimum permissions, strict spending limits, and a clear revocation path."
    )
  );
  section.append(heading, grid, recommendation);
  return section;
}

function privacyItem(title: string, copy: string): HTMLElement {
  const item = el("article", "privacy-item");
  item.append(el("h3", "", title), el("p", "", copy));
  return item;
}

function providerTypeLabel(type: ProviderType): string {
  const labels: Record<ProviderType, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    custom: "Custom endpoint"
  };
  return labels[type];
}

function field(label: string, control: HTMLElement, className = "") { const wrap = el("label", `field${className ? ` ${className}` : ""}`); wrap.append(el("span", "", label), control); return wrap; }
function input(name: string, value: string, placeholder: string, type = "text") { const node = document.createElement("input"); node.name = name; node.value = value; node.placeholder = placeholder; node.type = type; node.required = name !== "apiKey"; if (type === "number") { node.min = "5"; node.max = "180"; } return node; }
function button(text: string, className: string, handler?: () => void, type: "button" | "submit" = "button") { const node = el("button", className, text); node.type = type; if (handler) node.addEventListener("click", handler); return node; }
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function messageOf(value: unknown): string {
  if (value instanceof ZodError) {
    const issue = value.issues[0];
    const field = String(issue?.path[0] ?? "");
    const labels: Record<string, string> = {
      name: "Profile name",
      type: "Provider type",
      endpoint: "Endpoint",
      model: "Model",
      timeoutMs: "Request timeout",
      keyStorage: "API-key storage"
    };
    return `${labels[field] ?? "Profile"}: ${issue?.message ?? "Enter a valid value."}`;
  }
  if (value instanceof TypeError && /invalid url/iu.test(value.message)) {
    return "Enter a valid HTTP or HTTPS provider endpoint.";
  }
  return value instanceof Error
    ? value.message
    : "OpenLeet could not complete this action. Please try again.";
}
function style(): HTMLStyleElement {
  const node = document.createElement("style");
  node.textContent = `
  :root{color-scheme:dark}body{min-width:320px;background:
    radial-gradient(circle at 82% 4%,#7c3aed20 0,transparent 28rem),
    radial-gradient(circle at 8% 55%,#4c1d9514 0,transparent 24rem),
    #0c0b12}
  .shell{max-width:1180px;margin:0 auto;padding:48px 28px 76px}.top{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:30px}.top>.primary{flex:none}
  .title-block{min-width:0}.eyebrow{margin-bottom:8px;color:#a78bfa;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
  h1{font-size:31px;line-height:1.1;margin:0 0 9px;letter-spacing:-.025em}.mark{color:#c084fc}h2{font-size:17px;line-height:1.25;margin:0}h3{font-size:13px;margin:0}
  p{margin:0}.muted,.help{color:#a69db5;font-size:13px;line-height:1.55}.top .muted{max-width:660px}.layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:20px;align-items:start}
  .sidebar,.form,.privacy{background:linear-gradient(155deg,#171126f2,#100d1bf2);border:1px solid #7c3aed52;border-radius:16px;box-shadow:0 20px 55px #0005,0 0 28px #7c3aed0d}
  .sidebar{padding:18px;height:max-content;display:grid;gap:9px}.section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}.count{min-width:25px;height:22px;padding:0 7px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#7c3aed24;color:#c4b5fd;font-size:11px;font-weight:800}
  button,input,select{font:inherit}button{cursor:pointer}.profile{min-width:0;text-align:left;display:grid;gap:5px;background:#ffffff05;color:#eee9f8;border:1px solid #ffffff0d;padding:12px;border-radius:11px;transition:border-color .15s,background .15s,box-shadow .15s}.profile strong,.profile span{min-width:0;overflow-wrap:anywhere}.profile span{font-size:11px;line-height:1.4;color:#a69db5}.profile:hover{background:#8b5cf612;border-color:#8b5cf640}.profile.active{background:#7c3aed1c;border-color:#8b5cf6;box-shadow:0 0 16px #7c3aed32,inset 0 0 12px #7c3aed10}
  .form{padding:22px;display:grid;gap:18px}.form-heading{display:grid;gap:5px;padding-bottom:17px;border-bottom:1px solid #8b5cf629}.form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.wide{grid-column:1/-1}
  .field{min-width:0;display:grid;align-content:start;gap:8px;font-size:12px;font-weight:750;color:#d4cbe1}.field>span,.storage legend{letter-spacing:.01em}
  input,select{height:42px;width:100%;min-width:0;border:1px solid #5b4575;border-radius:10px;background:#0f0b18;color:#f4f1ff;padding:0 12px;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}input::placeholder{color:#70677f}input:hover,select:hover{border-color:#765995}input:focus,select:focus{border-color:#a78bfa;background:#130e20;box-shadow:0 0 0 3px #8b5cf627,0 0 15px #7c3aed20}
  .storage{min-width:0;margin:0;border:1px solid #8b5cf638;border-radius:12px;padding:14px;display:grid;gap:10px;background:#ffffff04}.storage legend{padding:0 6px;font-size:12px;font-weight:800;color:#e9ddf7}.storage-intro{margin:-2px 0 2px;color:#978da6;font-size:11px;line-height:1.45}
  .radio{display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid transparent;border-radius:9px;background:#0e0a15;cursor:pointer}.radio:hover{border-color:#7c3aed44;background:#7c3aed0d}.radio:has(input:checked){border-color:#8b5cf666;background:#7c3aed12;box-shadow:inset 0 0 12px #7c3aed10}.radio input{width:16px;height:16px;min-width:16px;margin:2px 0 0;padding:0;accent-color:#8b5cf6}.radio-copy{min-width:0;display:grid;gap:3px}.radio-copy strong{color:#eee9f8;font-size:12px}.radio-copy>span{color:#95899f;font-size:11px;line-height:1.35}
  .warning{font-size:11px;line-height:1.55;color:#fde7b0;background:#3b2a13;border:1px solid #8a6427;border-radius:9px;padding:11px 12px;box-shadow:inset 3px 0 0 #f59e0b}.warning strong{display:block;margin-bottom:4px;color:#ffefbd;font-size:11px}.warning p{margin:0}.warning[hidden]{display:none}
  .help{padding-top:2px}.actions{display:flex;align-items:center;flex-wrap:wrap;gap:9px;padding-top:17px;border-top:1px solid #8b5cf629}
  .primary,.secondary,.danger{min-height:40px;border-radius:10px;padding:9px 14px;font-weight:800;transition:transform .12s,filter .12s,background .12s,border-color .12s}.primary{background:linear-gradient(105deg,#7c3aed,#a855f7);color:#fff;border:0;box-shadow:0 8px 22px #7c3aed35}.primary:hover{filter:brightness(1.12);transform:translateY(-1px)}.secondary{background:#21162e;color:#e9ddf7;border:1px solid #6d4e8d}.secondary:hover{background:#2c1c3d;border-color:#8b5cf6}.danger{margin-left:auto;background:#351725;color:#fecdd3;border:1px solid #7f294b}.danger:hover{background:#461b2c;border-color:#a33d60}
  button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #c084fc;outline-offset:2px}
  .feedback{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;padding:12px 13px;border:1px solid;border-radius:10px;font-size:12px;line-height:1.45}.feedback-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-weight:900}.feedback-copy{min-width:0;display:grid;gap:3px}.feedback-copy strong{font-size:12px}.feedback-copy span{overflow-wrap:anywhere}.feedback.success{background:#112a1c;border-color:#22c55e66;color:#bbf7d0;box-shadow:inset 3px 0 0 #22c55e}.feedback.success .feedback-icon{background:#22c55e20;color:#86efac}.feedback.error{background:#3b1729;border-color:#ef444466;color:#fecdd3;box-shadow:inset 3px 0 0 #ef4444}.feedback.error .feedback-icon{background:#ef444420;color:#fda4af}.feedback.progress{background:#7c3aed18;border-color:#8b5cf655;color:#ddd6fe;box-shadow:inset 3px 0 0 #8b5cf6}.feedback.progress .feedback-icon{background:#8b5cf620;color:#c4b5fd}
  .privacy{margin-top:20px;padding:22px}.privacy-heading{display:grid;grid-template-columns:34px 1fr;gap:12px;align-items:start;padding-bottom:18px;border-bottom:1px solid #8b5cf629}.privacy-heading>div:last-child{display:grid;gap:6px}.privacy-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#7c3aed24;color:#c084fc;font-size:21px;box-shadow:0 0 14px #7c3aed2b}
  .privacy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:18px 0}.privacy-item{min-width:0;padding:14px;border:1px solid #8b5cf629;border-radius:11px;background:#ffffff04}.privacy-item h3{margin-bottom:7px;color:#e9ddf7}.privacy-item p{color:#a69db5;line-height:1.55;font-size:12px}.security-note{padding:12px 14px;border-radius:10px;background:#7c3aed10;color:#bfb5cb;font-size:12px;line-height:1.5}.security-note strong{color:#ddd6fe}
  @media(max-width:820px){.shell{padding:32px 18px 54px}.layout{grid-template-columns:1fr}.top{align-items:flex-start}.sidebar{max-height:250px;overflow:auto}.privacy-grid{grid-template-columns:1fr}.danger{margin-left:0}}
  @media(max-width:560px){.top{display:grid}.top .primary{width:100%}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}.form,.privacy{padding:17px}.actions>*{flex:1 1 100%}}
  `;
  return node;
}

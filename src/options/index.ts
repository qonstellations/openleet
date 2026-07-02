import { DEFAULT_ENDPOINTS, PERSISTENT_KEY_WARNING } from "../shared/defaults";
import { endpointOrigin, isLocalEndpoint, normalizeEndpoint } from "../shared/endpoint";
import { ProfileSchema, type ProviderProfile, type ProviderType, type RuntimeResponse } from "../shared/schemas";
import { getActiveProfileId, getApiKey, listProfiles, removeApiKey, saveApiKey, saveProfiles, setActiveProfileId } from "../shared/storage";

const app = document.querySelector<HTMLDivElement>("#app")!;
let profiles: ProviderProfile[] = [];
let selectedId = "";
let notice = "";
let error = "";

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
  const title = el("div");
  title.append(el("h1", "", "OpenLeet settings"), el("p", "muted", "Provider credentials stay inside the extension and are never sent to the LeetCode page."));
  const add = button("New profile", "primary", () => { selectedId = ""; notice = ""; error = ""; render(); });
  header.append(title, add);
  const layout = el("div", "layout");
  layout.append(renderList(), renderForm());
  shell.append(header, layout, renderPrivacy());
  app.append(style(), shell);
}

function renderList(): HTMLElement {
  const aside = el("aside", "sidebar");
  aside.append(el("h2", "", "Profiles"));
  if (!profiles.length) aside.append(el("p", "muted", "No provider profiles yet."));
  for (const profile of profiles) {
    const item = button("", `profile ${profile.id === selectedId ? "active" : ""}`, () => { selectedId = profile.id; notice = ""; error = ""; render(); });
    const local = isLocalEndpoint(profile.endpoint) ? " · local" : "";
    item.append(el("strong", "", profile.name), el("span", "", `${profile.type} · ${profile.model}${local}`));
    aside.append(item);
  }
  return aside;
}

function renderForm(): HTMLElement {
  const existing = profiles.find((profile) => profile.id === selectedId);
  const form = el("form", "form") as HTMLFormElement;
  form.addEventListener("submit", (event) => { event.preventDefault(); void save(form, existing); });
  form.append(el("h2", "", existing ? "Edit provider" : "Create provider"));
  if (notice) form.append(el("div", "notice", notice));
  if (error) form.append(el("div", "error", error));
  form.append(
    field("Profile name", input("name", existing?.name ?? "", "e.g. Local Ollama")),
    field("Provider type", providerSelect(existing?.type ?? "openai")),
    field("Endpoint", input("endpoint", existing?.endpoint ?? DEFAULT_ENDPOINTS.openai, "https://…")),
    field("Model", input("model", existing?.model ?? "", "e.g. gpt-4.1-mini")),
    field("Request timeout (seconds)", input("timeout", String((existing?.timeoutMs ?? 60_000) / 1000), "60", "number")),
    field("API key", secretInput(existing)),
    storageField(existing?.keyStorage ?? "session")
  );
  form.append(el("p", "help", "Leave the API key blank to keep the currently stored key. Custom/local endpoints may work without one."));
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
  const wrap = el("fieldset", "storage");
  wrap.append(el("legend", "", "API-key storage"));
  wrap.append(radio("session", "Remember until Chrome closes", value === "session"));
  wrap.append(radio("persistent", "Remember in this Chrome profile", value === "persistent"));
  const warning = el("div", "warning", PERSISTENT_KEY_WARNING);
  wrap.append(warning);
  return wrap;
}

function radio(value: string, label: string, checked: boolean): HTMLElement {
  const line = el("label", "radio");
  const node = document.createElement("input");
  node.type = "radio"; node.name = "keyStorage"; node.value = value; node.checked = checked;
  line.append(node, document.createTextNode(label));
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
      if (!window.confirm(PERSISTENT_KEY_WARNING)) return;
    }
    await ensurePermission(profile.endpoint);
    const previousKey = existing ? await getApiKey(existing) : undefined;
    const next = existing ? profiles.map((item) => item.id === profile.id ? profile : item) : [...profiles, profile];
    await saveProfiles(next);
    if (key) await saveApiKey(profile, key);
    else if (previousKey && existing?.keyStorage !== profile.keyStorage) await saveApiKey(profile, previousKey);
    profiles = next; selectedId = profile.id;
    if (!(await getActiveProfileId())) await setActiveProfileId(profile.id);
    error = ""; notice = "Profile saved. Endpoint access is allowed.";
    render();
  } catch (caught) {
    error = messageOf(caught); notice = ""; render();
  }
}

async function testProfile(form: HTMLFormElement, existing: ProviderProfile) {
  try {
    const parsed = await profileFrom(form, existing);
    if (parsed.profile.keyStorage === "persistent" && (parsed.key || existing.keyStorage !== "persistent") && !window.confirm(PERSISTENT_KEY_WARNING)) return;
    await ensurePermission(parsed.profile.endpoint);
    const oldKey = await getApiKey(existing);
    profiles = profiles.map((item) => item.id === existing.id ? parsed.profile : item);
    await saveProfiles(profiles);
    if (parsed.key) await saveApiKey(parsed.profile, parsed.key);
    else if (oldKey && existing.keyStorage !== parsed.profile.keyStorage) await saveApiKey(parsed.profile, oldKey);
    notice = "Testing profile…"; error = ""; render();
    const response = await sendMessage({ type: "TEST_PROFILE", profileId: parsed.profile.id });
    if (!response.ok) throw new Error(response.message);
    notice = response.message ?? "Profile test succeeded."; error = ""; render();
  } catch (caught) { error = messageOf(caught); notice = ""; render(); }
}

async function removeKey(profile: ProviderProfile) {
  await removeApiKey(profile.id);
  notice = "Stored API key removed from both session and persistent storage.";
  error = ""; render();
}

async function deleteProfile(profile: ProviderProfile) {
  if (!window.confirm(`Delete provider profile “${profile.name}”?`)) return;
  await removeApiKey(profile.id);
  profiles = profiles.filter((item) => item.id !== profile.id);
  await saveProfiles(profiles);
  if ((await getActiveProfileId()) === profile.id && profiles[0]) await setActiveProfileId(profiles[0].id);
  selectedId = profiles[0]?.id ?? ""; notice = "Profile deleted."; error = ""; render();
}

async function ensurePermission(endpoint: string) {
  const origins = [endpointOrigin(endpoint)];
  if (await chrome.permissions.contains({ origins })) return;
  if (!(await chrome.permissions.request({ origins }))) throw new Error("Endpoint permission was not granted. OpenLeet cannot contact this provider.");
}

function sendMessage(message: unknown): Promise<RuntimeResponse> {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, (response: RuntimeResponse) => {
    if (chrome.runtime.lastError) reject(new Error("The OpenLeet service worker is unavailable."));
    else resolve(response);
  }));
}

function renderPrivacy(): HTMLElement {
  const section = el("section", "privacy");
  section.append(el("h2", "", "Privacy and security boundary"), el("p", "", "Problem text and code are sent only to the active provider when you analyse. Requests to local endpoints remain on your device. OpenLeet has no inference backend, accounts, analytics, telemetry, or analysis history. Persistent credentials can be retrieved by someone with Chrome-profile access, extension debugging access, or a compromised device."));
  return section;
}

function field(label: string, control: HTMLElement) { const wrap = el("label", "field"); wrap.append(el("span", "", label), control); return wrap; }
function input(name: string, value: string, placeholder: string, type = "text") { const node = document.createElement("input"); node.name = name; node.value = value; node.placeholder = placeholder; node.type = type; node.required = name !== "apiKey"; if (type === "number") { node.min = "5"; node.max = "180"; } return node; }
function button(text: string, className: string, handler?: () => void, type: "button" | "submit" = "button") { const node = el("button", className, text); node.type = type; if (handler) node.addEventListener("click", handler); return node; }
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function messageOf(value: unknown) { return value instanceof Error ? value.message : "The operation failed."; }
function style(): HTMLStyleElement {
  const node = document.createElement("style");
  node.textContent = `
  .shell{max-width:1120px;margin:0 auto;padding:42px 24px 70px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:30px}
  h1{font-size:28px;margin:0 0 6px}h2{font-size:16px;margin:0 0 16px}.muted,.help{color:#94a3b8;font-size:13px}.layout{display:grid;grid-template-columns:270px 1fr;gap:20px}
  .sidebar,.form,.privacy{background:#111827;border:1px solid #273449;border-radius:14px;padding:18px}.sidebar{height:max-content;display:grid;gap:8px}
  button{font:inherit;cursor:pointer}.profile{text-align:left;display:grid;gap:4px;background:transparent;color:#e5e7eb;border:1px solid transparent;padding:10px;border-radius:9px}.profile span{font-size:11px;color:#94a3b8}.profile.active{background:#1d293d;border-color:#3b4b66}
  .form{display:grid;gap:16px}.field{display:grid;gap:7px;font-size:12px;font-weight:700;color:#cbd5e1}input,select{width:100%;border:1px solid #3a485e;border-radius:8px;background:#0b1220;color:#f1f5f9;padding:10px;font:inherit}
  .storage{border:1px solid #344158;border-radius:10px;padding:12px;display:grid;gap:9px}.storage legend{font-size:12px;font-weight:700}.radio{font-size:13px;display:flex;align-items:center;gap:8px}.radio input{width:auto}
  .warning{font-size:12px;line-height:1.5;color:#fcdca7;background:#352817;border:1px solid #67502a;border-radius:8px;padding:10px}.actions{display:flex;flex-wrap:wrap;gap:8px}
  .primary,.secondary,.danger{border-radius:8px;padding:9px 12px;font-weight:700}.primary{background:#34d399;color:#052e22;border:0}.secondary{background:#1e293b;color:#e2e8f0;border:1px solid #46556e}.danger{background:#351c25;color:#fecdd3;border:1px solid #6f3348}
  .notice,.error{padding:11px;border-radius:8px;font-size:13px}.notice{background:#17342d;color:#a7f3d0}.error{background:#3a1d27;color:#fecdd3}.privacy{margin-top:20px}.privacy p{color:#aeb9ca;line-height:1.6;font-size:13px}
  @media(max-width:760px){.layout{grid-template-columns:1fr}.top{align-items:flex-start}.sidebar{max-height:240px;overflow:auto}}
  `;
  return node;
}

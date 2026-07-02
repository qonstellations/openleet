import { RuntimeRequestSchema, type RuntimeResponse } from "../shared/schemas";
import { endpointOrigin } from "../shared/endpoint";
import { getApiKey, listProfiles } from "../shared/storage";
import { OpenLeetError, sanitizeError } from "../shared/errors";
import { analyseWithProvider, classifyNetworkError, testProviderConnection } from "./provider";

const active = new Map<string, AbortController>();

chrome.action.onClicked.addListener(() => void openOptionsPage());

chrome.runtime.onMessage.addListener((raw: unknown, _sender, sendResponse: (response: RuntimeResponse) => void) => {
  const parsed = RuntimeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    sendResponse({ ok: false, code: "VALIDATION", message: "OpenLeet rejected an invalid extension message." });
    return false;
  }
  const message = parsed.data;
  if (message.type === "CANCEL") {
    active.get(message.requestId)?.abort();
    active.delete(message.requestId);
    sendResponse({ ok: true, requestId: message.requestId, message: "Cancelled" });
    return false;
  }
  if (message.type === "OPEN_OPTIONS") {
    void openOptionsPage()
      .then(() => sendResponse({ ok: true, message: "Opened settings" }))
      .catch((error: unknown) => sendResponse({ ok: false, ...sanitizeError(error) }));
    return true;
  }
  void handle(message).then(sendResponse);
  return true;
});

async function openOptionsPage(): Promise<void> {
  const runtime = chrome.runtime as typeof chrome.runtime & {
    openOptionsPage?: () => void | Promise<void>;
  };
  if (typeof runtime.openOptionsPage === "function") {
    await runtime.openOptionsPage();
    return;
  }
  await chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
}

async function handle(message: Exclude<ReturnType<typeof RuntimeRequestSchema.parse>, { type: "CANCEL" | "OPEN_OPTIONS" }>): Promise<RuntimeResponse> {
  try {
    const profile = (await listProfiles()).find((item) => item.id === message.profileId);
    if (!profile) throw new OpenLeetError("VALIDATION", "The selected provider profile no longer exists.");
    const allowed = await chrome.permissions.contains({ origins: [endpointOrigin(profile.endpoint)] });
    if (!allowed) throw new OpenLeetError("ENDPOINT_PERMISSION", "OpenLeet does not have permission to contact this endpoint. Edit or test the profile in settings to grant access.");
    const key = await getApiKey(profile);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), profile.timeoutMs);
    const requestId = message.type === "ANALYSE" ? message.requestId : crypto.randomUUID();
    active.set(requestId, controller);
    try {
      if (message.type === "TEST_PROFILE") {
        const result = await testProviderConnection(profile, key, controller.signal);
        return { ok: true, message: result };
      }
      const analysis = await analyseWithProvider(profile, key, message.context, controller.signal);
      return { ok: true, requestId, fingerprint: message.context.fingerprint, analysis };
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason === "timeout") throw new OpenLeetError("TIMEOUT", `The provider did not respond within ${profile.timeoutMs / 1000} seconds.`);
      classifyNetworkError(error, profile);
    } finally {
      clearTimeout(timer);
      active.delete(requestId);
    }
  } catch (error) {
    const safe = sanitizeError(error);
    return { ok: false, ...(message.type === "ANALYSE" ? { requestId: message.requestId } : {}), ...safe };
  }
}

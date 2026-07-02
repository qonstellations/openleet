import type { ProviderProfile, ProblemContext } from "../shared/schemas";
import { joinEndpoint, isLocalEndpoint } from "../shared/endpoint";
import { OpenLeetError } from "../shared/errors";
import { SYSTEM_PROMPT, createUserPrompt } from "./prompt";
import { parseAnalysis } from "./parser";

type FetchLike = typeof fetch;

export async function analyseWithProvider(
  profile: ProviderProfile,
  apiKey: string | undefined,
  context: ProblemContext,
  signal: AbortSignal,
  fetcher: FetchLike = fetch
) {
  if (profile.type !== "custom" && !apiKey) {
    throw new OpenLeetError("AUTHENTICATION", "This provider requires an API key. Add one in OpenLeet settings.");
  }
  const response = await request(profile, apiKey, context, signal, fetcher);
  if (!response.ok) throw await responseError(response, profile);
  let payload: any;
  try { payload = await response.json(); } catch {
    throw new OpenLeetError("MALFORMED_RESPONSE", "The provider returned a non-JSON response.");
  }
  const text = responseText(profile, payload);
  if (!text) throw new OpenLeetError("UNSUPPORTED_FORMAT", "The provider response did not use a supported OpenAI, Anthropic, or Gemini response format.");
  return parseAnalysis(text);
}

export async function testProviderConnection(
  profile: ProviderProfile,
  apiKey: string | undefined,
  signal: AbortSignal,
  fetcher: FetchLike = fetch
): Promise<string> {
  if (profile.type !== "custom" && !apiKey) {
    throw new OpenLeetError("AUTHENTICATION", "This provider requires an API key. Add one before testing.");
  }
  const headers: Record<string, string> = {};
  if (profile.type === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
    if (apiKey) headers["x-api-key"] = apiKey;
  } else if (profile.type === "gemini") {
    if (apiKey) headers["x-goog-api-key"] = apiKey;
  } else if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  let response: Response;
  try {
    response = await fetcher(joinEndpoint(profile.endpoint, "/models"), { method: "GET", headers, signal });
  } catch (error) {
    classifyNetworkError(error, profile);
  }
  if (!response!.ok) throw await responseError(response!, profile);
  let payload: any;
  try { payload = await response!.json(); } catch {
    throw new OpenLeetError("MALFORMED_RESPONSE", "The endpoint responded, but its model-list response was not JSON.");
  }
  const ids: string[] = profile.type === "gemini"
    ? (payload?.models ?? []).map((item: any) => String(item?.name ?? "").replace(/^models\//, ""))
    : (payload?.data ?? payload?.models ?? []).map((item: any) => String(item?.id ?? item?.name ?? "").replace(/^models\//, ""));
  if (ids.length && !ids.includes(profile.model.replace(/^models\//, ""))) {
    throw new OpenLeetError("MODEL_UNAVAILABLE", `The endpoint is reachable, but model "${profile.model}" was not listed.`);
  }
  return `Connected to ${profile.name}${ids.length ? `; model "${profile.model}" is available` : ""}.`;
}

async function request(profile: ProviderProfile, apiKey: string | undefined, context: ProblemContext, signal: AbortSignal, fetcher: FetchLike) {
  const user = createUserPrompt(context);
  if (profile.type === "anthropic") {
    return fetcher(joinEndpoint(profile.endpoint, "/messages"), {
      method: "POST", signal,
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        ...(apiKey ? { "x-api-key": apiKey } : {})
      },
      body: JSON.stringify({ model: profile.model, max_tokens: 1800, temperature: 0, system: SYSTEM_PROMPT, messages: [{ role: "user", content: user }] })
    });
  }
  if (profile.type === "gemini") {
    return fetcher(joinEndpoint(profile.endpoint, `/models/${encodeURIComponent(profile.model)}:generateContent`), {
      method: "POST", signal,
      headers: { "content-type": "application/json", ...(apiKey ? { "x-goog-api-key": apiKey } : {}) },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      })
    });
  }
  return fetcher(joinEndpoint(profile.endpoint, "/chat/completions"), {
    method: "POST", signal,
    headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({
      model: profile.model, temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: user }]
    })
  });
}

function responseText(profile: ProviderProfile, payload: any): string | undefined {
  if (profile.type === "anthropic") {
    return payload?.content?.find((item: any) => item?.type === "text")?.text;
  }
  if (profile.type === "gemini") {
    return payload?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("");
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part: any) => part?.text ?? "").join("");
  return undefined;
}

async function responseError(response: Response, profile: ProviderProfile): Promise<OpenLeetError> {
  let detail = "";
  try {
    const payload: any = await response.json();
    detail = payload?.error?.message ?? payload?.message ?? "";
  } catch { /* use status */ }
  if (response.status === 401 || response.status === 403) return new OpenLeetError("AUTHENTICATION", "Authentication failed. Replace the API key and verify provider access.");
  if (response.status === 404) return new OpenLeetError("MODEL_UNAVAILABLE", `The endpoint or model "${profile.model}" was not found.`);
  if (response.status === 400 && /model/i.test(detail)) return new OpenLeetError("MODEL_UNAVAILABLE", `The provider rejected model "${profile.model}".`);
  return new OpenLeetError("NETWORK", `Provider request failed (${response.status})${detail ? `: ${detail}` : "."}`);
}

export function classifyNetworkError(error: unknown, profile: ProviderProfile): never {
  if (error instanceof OpenLeetError) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  if (isLocalEndpoint(profile.endpoint)) throw new OpenLeetError("LOCAL_UNAVAILABLE", "The local model server is unavailable. Start it, verify its port, and allow this endpoint in settings.");
  throw new OpenLeetError("NETWORK", "The provider could not be reached. Check the endpoint, network, and extension host permission.");
}

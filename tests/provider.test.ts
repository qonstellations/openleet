import { describe, expect, it, vi } from "vitest";
import { analyseWithProvider, classifyNetworkError, testProviderConnection } from "../src/background/provider";
import { analysis, context, profile } from "./fixtures";

function ok(payload: unknown) {
  return Promise.resolve(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }));
}

describe("provider request construction", () => {
  it("constructs OpenAI-compatible JSON requests without putting keys in URLs", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      ok({ choices: [{ message: { content: JSON.stringify(analysis) } }] }));
    await expect(analyseWithProvider(profile, "sk-secret-value", context, new AbortController().signal, fetcher as typeof fetch)).resolves.toEqual(analysis);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(String(url)).not.toContain("sk-secret-value");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer sk-secret-value");
    expect(String(init?.body)).toContain("Two Sum");
    const body = JSON.parse(String(init?.body));
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.required).toEqual(["recommended", "implementation"]);
  });
  it("uses headers, not query strings, for Gemini keys", async () => {
    const gemini = { ...profile, type: "gemini" as const, endpoint: "https://generativelanguage.googleapis.com/v1beta" };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      ok({ candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }] }));
    await analyseWithProvider(gemini, "gem-key", context, new AbortController().signal, fetcher as typeof fetch);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).not.toContain("gem-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("gem-key");
  });
  it("maps Anthropic response format", async () => {
    const anthropic = { ...profile, type: "anthropic" as const, endpoint: "https://api.anthropic.com/v1" };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      ok({ content: [{ type: "text", text: JSON.stringify(analysis) }] }));
    await expect(analyseWithProvider(anthropic, "key", context, new AbortController().signal, fetcher as typeof fetch)).resolves.toEqual(analysis);
  });
  it("falls back to JSON-object mode when a custom endpoint rejects JSON Schema", async () => {
    const custom = { ...profile, type: "custom" as const };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"json_schema unsupported"}}', { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(analysis) } }]
      }), { status: 200, headers: { "content-type": "application/json" } }));
    await expect(analyseWithProvider(custom, undefined, context, new AbortController().signal, fetcher as typeof fetch)).resolves.toEqual(analysis);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).response_format.type).toBe("json_schema");
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)).response_format.type).toBe("json_object");
  });
  it("reports local connection failures usefully", () => {
    expect(() => classifyNetworkError(new TypeError("fetch failed"), { ...profile, type: "custom", endpoint: "http://localhost:11434/v1" })).toThrow(/local model server/i);
  });
  it("tests endpoint authentication and model availability", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      ok({ data: [{ id: "test-model" }] }));
    await expect(testProviderConnection(profile, "key", new AbortController().signal, fetcher as typeof fetch)).resolves.toMatch(/available/);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.example.com/v1/models");
  });
  it("honours cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn((_url, init) => Promise.reject(new DOMException("Aborted", init?.signal?.aborted ? "AbortError" : "Error")));
    await expect(analyseWithProvider(profile, "key", context, controller.signal, fetcher as typeof fetch)).rejects.toMatchObject({ name: "AbortError" });
  });
});

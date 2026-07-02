import { describe, expect, it } from "vitest";
import { endpointOrigin, isLocalEndpoint, joinEndpoint, normalizeEndpoint } from "../src/shared/endpoint";

describe("endpoint handling", () => {
  it("normalizes and joins API paths", () => {
    expect(normalizeEndpoint("https://api.example.com/v1///")).toBe("https://api.example.com/v1");
    expect(joinEndpoint("https://api.example.com/v1/", "/chat/completions")).toBe("https://api.example.com/v1/chat/completions");
    expect(endpointOrigin("https://api.example.com/v1")).toBe("https://api.example.com/*");
  });
  it.each(["http://localhost:11434/v1", "http://127.0.0.1:1234/v1", "http://[::1]:1234/v1", "http://192.168.1.8:8000/v1"])("detects local endpoint %s", (value) => {
    expect(isLocalEndpoint(value)).toBe(true);
  });
  it("rejects non-HTTP endpoints", () => expect(() => normalizeEndpoint("file:///secret")).toThrow());
});

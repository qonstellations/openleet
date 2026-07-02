import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApiKey, removeApiKey, saveApiKey } from "../src/shared/storage";
import { profile } from "./fixtures";

function area() {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: vi.fn(async (key: string) => ({ [key]: data[key] })),
    set: vi.fn(async (values: Record<string, unknown>) => Object.assign(data, values)),
    remove: vi.fn(async (key: string) => { delete data[key]; })
  };
}

describe("API-key separation", () => {
  const local = area();
  const session = area();
  beforeEach(() => {
    Object.keys(local.data).forEach((key) => delete local.data[key]);
    Object.keys(session.data).forEach((key) => delete session.data[key]);
    vi.stubGlobal("chrome", { storage: { local, session } });
  });
  it("defaults credentials to session storage and excludes them from profile objects", async () => {
    await saveApiKey(profile, "session-secret");
    expect(session.data[`key:${profile.id}`]).toBe("session-secret");
    expect(local.data[`key:${profile.id}`]).toBeUndefined();
    expect(JSON.stringify(profile)).not.toContain("session-secret");
    expect(await getApiKey(profile)).toBe("session-secret");
  });
  it("stores persistent keys only after that mode is selected and removes both copies", async () => {
    const persistent = { ...profile, keyStorage: "persistent" as const };
    await saveApiKey(persistent, "local-secret");
    expect(local.data[`key:${profile.id}`]).toBe("local-secret");
    await removeApiKey(profile.id);
    expect(local.data[`key:${profile.id}`]).toBeUndefined();
    expect(session.data[`key:${profile.id}`]).toBeUndefined();
  });
});

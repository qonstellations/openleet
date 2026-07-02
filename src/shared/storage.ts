import { ProfileSchema, type ProviderProfile } from "./schemas";

const PROFILES = "profiles";
const ACTIVE = "activeProfileId";
const KEY_PREFIX = "key:";

export async function listProfiles(): Promise<ProviderProfile[]> {
  const data = await chrome.storage.local.get(PROFILES);
  return ProfileSchema.array().catch([]).parse(data[PROFILES]);
}

export async function saveProfiles(profiles: ProviderProfile[]): Promise<void> {
  await chrome.storage.local.set({ [PROFILES]: ProfileSchema.array().parse(profiles) });
}

export async function getActiveProfileId(): Promise<string | undefined> {
  const data = await chrome.storage.local.get(ACTIVE);
  return typeof data[ACTIVE] === "string" ? data[ACTIVE] : undefined;
}

export async function setActiveProfileId(id: string): Promise<void> {
  await chrome.storage.local.set({ [ACTIVE]: id });
}

export async function saveApiKey(profile: ProviderProfile, key: string): Promise<void> {
  await removeApiKey(profile.id);
  if (!key) return;
  const area = profile.keyStorage === "persistent" ? chrome.storage.local : chrome.storage.session;
  await area.set({ [`${KEY_PREFIX}${profile.id}`]: key });
}

export async function getApiKey(profile: ProviderProfile): Promise<string | undefined> {
  const area = profile.keyStorage === "persistent" ? chrome.storage.local : chrome.storage.session;
  const data = await area.get(`${KEY_PREFIX}${profile.id}`);
  const value = data[`${KEY_PREFIX}${profile.id}`];
  return typeof value === "string" && value ? value : undefined;
}

export async function hasApiKey(profile: ProviderProfile): Promise<boolean> {
  return Boolean(await getApiKey(profile));
}

export async function removeApiKey(id: string): Promise<void> {
  const key = `${KEY_PREFIX}${id}`;
  await Promise.all([chrome.storage.local.remove(key), chrome.storage.session.remove(key)]);
}

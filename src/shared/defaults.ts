import type { ProviderType } from "./schemas";

export const DEFAULT_ENDPOINTS: Record<ProviderType, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  custom: "http://localhost:11434/v1"
};

export const PERSISTENT_KEY_WARNING =
  "Persistent storage keeps this API key in your Chrome profile until you remove it. Chrome extension storage is not a credential vault and does not provide operating-system or hardware-backed protection. Anyone with access to this browser profile, extension debugging tools, or the device may be able to retrieve the key. Use a dedicated key with minimum permissions and strict spending limits.";

import type { ProviderType } from "./schemas";

export const DEFAULT_ENDPOINTS: Record<ProviderType, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  custom: "http://localhost:11434/v1"
};

export const PERSISTENT_KEY_WARNING =
  "The key is stored locally in your Chrome profile for convenience. It is not protected by hardware-backed or operating-system credential storage. Someone with access to this Chrome profile, extension debugging tools, or a compromised device may be able to retrieve it. Use a dedicated API key with restricted permissions and spending limits.";

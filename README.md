# OpenLeet

OpenLeet is a Chrome extension that analyses the algorithmic approach and complexity of the code currently open in a normal LeetCode problem. It uses a provider chosen and configured by the user. It is deliberately not a chatbot, solution generator, interviewer, code runner, or submission tool.

## Features

- Adds an **Analyse with OpenLeet** button to supported `leetcode.com/problems/...` pages.
- Reads the problem description (including examples and constraints), selected editor language, and current code.
- Compares a recommended approach with the implementation's approach, time complexity, and space complexity.
- Explains whether differences are slower, use more memory, are a valid trade-off, are differently valid, or are uncertain.
- Draws normalized relative-growth curves from a validated complexity classification. It does not treat the model's prose as graph coordinates.
- Handles standard, multiple-variable, amortised, average-case, output-sensitive, unusual, and uncertain classifications without fabricating curves.
- Supports OpenAI, Anthropic, Gemini, Ollama, LM Studio, and custom OpenAI-compatible endpoints.
- Provides session-only keys by default and opt-in persistent local key storage with an explicit warning.
- Supports profile creation, editing, testing, selection, endpoint permission grants, key replacement/removal, and deletion.
- Handles cancellation, timeouts, stale code/results, single-page navigation, editor delays, malformed responses, local server failures, and endpoint permissions.
- Disables analysis on detected contest, assessment, interview-simulation, exam, and restricted-test pages.
- Includes no analytics, telemetry, accounts, backend, history, cloud sync, or payments.

## Architecture

OpenLeet is a Chrome Manifest V3 extension written in strict TypeScript and bundled with esbuild.

- **Content script:** Detects supported/restricted routes, extracts visible problem content, coordinates editor extraction, and renders the UI in a closed Shadow DOM. It receives validated analysis results but never receives API keys.
- **Page bridge:** Reads the active Monaco model from LeetCode's JavaScript world when available. It exchanges only editor code/language using a request nonce. DOM-based fallbacks cover delayed or changed editor integrations.
- **Service worker:** The sole provider-request boundary. It validates every runtime message, resolves the selected profile and key from extension storage, verifies host permission, constructs provider-specific requests, enforces timeouts/cancellation, validates results, and sanitizes errors.
- **Options page:** Manages profiles, keys, active selection, storage warnings, and per-origin optional host permission.
- **Schemas:** Zod validates profiles, content-to-worker messages, problem context, complexity classifications, and complete provider output.
- **Reliability boundary:** Every request carries a UUID and a SHA-256 fingerprint of problem slug, language, and code. Before display, the current page and editor are re-read. A response for changed code or another problem is discarded.
- **Graph:** A deterministic local mapper converts supported model classifications to normalized curves. Unsupported classifications show an explanation instead of invented coordinates.

No runtime framework is used in the page UI, keeping the content bundle and interference surface small.

## Repository structure

```text
openleet/
├── docs/
│   ├── MANUAL_TESTS.md
│   └── PRIVACY_SECURITY.md
├── public/
│   ├── manifest.json
│   └── options.html
├── scripts/
│   └── build.mjs
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── parser.ts
│   │   ├── prompt.ts
│   │   └── provider.ts
│   ├── content/
│   │   ├── extractor.ts
│   │   ├── graph.ts
│   │   ├── index.ts
│   │   ├── page-bridge.ts
│   │   ├── restrictions.ts
│   │   ├── stale.ts
│   │   └── styles.ts
│   ├── options/
│   │   └── index.ts
│   └── shared/
│       ├── defaults.ts
│       ├── endpoint.ts
│       ├── errors.ts
│       ├── schemas.ts
│       └── storage.ts
├── tests/
│   ├── endpoint.test.ts
│   ├── fixtures.ts
│   ├── graph.test.ts
│   ├── parser.test.ts
│   ├── provider.test.ts
│   ├── reliability.test.ts
│   ├── schemas.test.ts
│   └── storage.test.ts
├── eslint.config.js
├── package.json
└── tsconfig.json
```

`dist/` is generated and contains the unpackable production extension.

## Development

Prerequisites: Node.js 20 or newer, npm, and Chrome 116 or newer.

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Run everything:

```bash
npm run verify
```

Tests mock provider responses; no real keys or network access are needed.

## Load the unpacked extension

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this repository's `dist/` directory.
5. Select the OpenLeet toolbar icon to configure a provider.
6. Open a normal LeetCode problem and wait for the editor and description to load.
7. Select **Analyse with OpenLeet**.

After rebuilding, select **Reload** on the extension card and reload the LeetCode tab.

## Provider setup

Profiles contain a display name, provider type, endpoint, model, timeout, key storage mode, and an optional API key. Saving a profile asks Chrome for access only to that endpoint's origin. The embedded panel can switch among configured profiles.

### OpenAI

- Type: `OpenAI`
- Endpoint: `https://api.openai.com/v1`
- Model: a chat-completions model available to the key, for example `gpt-4.1-mini`
- API key: required

OpenLeet calls `POST /chat/completions` and requests a JSON object.

### Anthropic

- Type: `Anthropic`
- Endpoint: `https://api.anthropic.com/v1`
- Model: an available Claude model ID
- API key: required

OpenLeet calls `POST /messages` with the `anthropic-version` and `x-api-key` headers.

### Gemini

- Type: `Gemini`
- Endpoint: `https://generativelanguage.googleapis.com/v1beta`
- Model: an available Gemini model ID
- API key: required

OpenLeet calls `models/{model}:generateContent`. The key is carried in the `x-goog-api-key` header, never in the URL.

### Ollama

1. Install and start Ollama.
2. Pull an instruction-capable model, for example `ollama pull qwen2.5-coder`.
3. Create a profile:
   - Type: `Custom OpenAI-compatible`
   - Endpoint: `http://localhost:11434/v1`
   - Model: the pulled model name, such as `qwen2.5-coder`
   - API key: blank
4. Grant the local endpoint permission when prompted.

Ollama must be running and its OpenAI-compatible endpoint must be enabled by the installed version.

### LM Studio

1. Load a model in LM Studio.
2. Start its local server in OpenAI-compatible mode.
3. Create a profile:
   - Type: `Custom OpenAI-compatible`
   - Endpoint: commonly `http://localhost:1234/v1`
   - Model: the model identifier shown by LM Studio
   - API key: blank unless LM Studio authentication is enabled
4. Grant the local endpoint permission.

### Other custom endpoints

Choose `Custom OpenAI-compatible`. Enter the base URL through `/v1` when that is how the server exposes its API. The server must implement `POST {endpoint}/chat/completions` and return `choices[0].message.content`. It should accept the OpenAI JSON response-format hint. If it ignores that hint, the selected model must still return the requested JSON schema.

HTTP endpoints are permitted for local workflows. Use HTTPS for remote endpoints; remote HTTP exposes problem text, code, and credentials to network interception.

## API-key handling

**Remember until Chrome closes** is the default. The key is stored in `chrome.storage.session`, is not included in profile objects, and is lost when Chrome's extension session ends.

**Remember in this Chrome profile** is opt-in. Before enabling it, OpenLeet displays this warning:

> The key is stored locally in your Chrome profile for convenience. It is not protected by hardware-backed or operating-system credential storage. Someone with access to this Chrome profile, extension debugging tools, or a compromised device may be able to retrieve it. Use a dedicated API key with restricted permissions and spending limits.

Keys are read only by extension pages and the service worker. They are never sent to the LeetCode page, page DOM, attributes, analytics, telemetry, URLs, query parameters, or error text. A provider key is sent only in that provider's required request header. Removing a key clears both session and persistent storage copies.

## Privacy

- Problem text and code are sent only to the active provider after the user selects **Analyse**.
- Requests to a local endpoint stay on the device, subject to the local server's own behavior.
- OpenLeet runs no inference backend and does not intentionally collect API keys.
- Code and analysis history are not stored by default.
- No analytics, telemetry, crash reporting, user accounts, or cloud synchronization are included.
- Provider operators receive the submitted problem/code under their own terms and retention policies.

See [docs/PRIVACY_SECURITY.md](docs/PRIVACY_SECURITY.md).

## Security limitations

- Chrome extension storage is not a credential vault. Persistent keys are retrievable by a user or process with sufficient profile/device/debugging access.
- Session storage reduces persistence but does not protect a key on a compromised live device.
- The service worker necessarily holds a key in memory while making a request.
- Custom endpoints are trusted by the user. A malicious or misconfigured endpoint can retain submitted code and keys.
- HTTP should be limited to loopback/local networks. It does not provide transport confidentiality.
- LeetCode can change its DOM or editor internals. OpenLeet uses several extraction strategies, but no unofficial DOM integration can be guaranteed indefinitely.
- Restricted-page detection is conservative and heuristic; it cannot prove the policy state of every third-party or newly changed LeetCode environment.

## Troubleshooting

- **Button missing:** Confirm the URL is `https://leetcode.com/problems/<slug>/`, reload the extension and tab, and wait for the SPA to render. Contest/assessment pages are intentionally blocked.
- **Editor cannot be read:** Make the editor visible, wait for Monaco to load, click inside it, and retry. Reload after an extension update.
- **Endpoint permission missing:** Edit or test the profile and approve Chrome's origin prompt.
- **Local server unavailable:** Start Ollama/LM Studio, verify host and port, confirm the model is loaded, and test the profile.
- **Model unavailable:** Use the exact model identifier exposed by the provider or local server.
- **Authentication failed:** Replace the key, verify its permissions, and check provider spending/rate limits.
- **Malformed response:** Select a model with reliable instruction following/JSON output, increase model capability, or retry. OpenLeet will not display an incomplete result.
- **Timeout:** Increase the profile timeout (maximum 180 seconds), use a smaller local model, or check provider health.
- **Stale result discarded:** The code, language, or problem changed while the request was running. Run analysis again on the current state.
- **Custom API rejects `response_format`:** The endpoint is not fully compatible. Use a compatibility mode that accepts OpenAI chat-completions fields.

## Known limitations

- LeetCode integration relies on its current URL, description DOM, and Monaco editor. Site changes may require selector updates.
- The graph deliberately omits a curve for multi-variable, amortised, average-case, output-sensitive, unusual, and uncertain classes. Their written complexity remains visible.
- Standard complexity curves are normalized independently to show shape. They do not compare constants or measured execution time.
- Profile testing performs an authenticated `GET /models` request and checks the configured model when the endpoint returns a model list. Full structured-output verification occurs when analysis is run.
- Chrome optional host permissions are origin-wide because provider request paths vary.
- Local requests remain on-device only when the configured endpoint resolves locally and the local tool itself does not relay data.

## Future extension points

Within the focused complexity-analysis scope, provider adapters can be added behind the worker interface, extraction selectors can be updated independently, and more well-defined single-variable complexity classes can be added to the deterministic graph mapper. Features excluded from this release—chat, solution generation, code execution, submissions, history, accounts, and analytics—are intentionally absent.

## Manual verification

The complete browser checklist is in [docs/MANUAL_TESTS.md](docs/MANUAL_TESTS.md).

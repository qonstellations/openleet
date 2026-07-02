# Privacy and security

## Data flow

The LeetCode content script reads the current problem text, language, and code. It sends those values, the selected profile ID, and a request ID to the extension service worker. The profile ID is not a credential. The service worker validates the message, reads the profile and key from extension storage, and contacts only the selected endpoint. The validated analysis returns to the content script.

The page bridge can read Monaco editor text but has no extension API access and never receives profiles or keys. The closed Shadow DOM prevents accidental style collisions; it is not presented as a security boundary against the host page.

## Storage

Provider metadata is stored in `chrome.storage.local`. Keys use a separate `key:<profile UUID>` record:

- Session mode: `chrome.storage.session`.
- Persistent mode: `chrome.storage.local`, only after an explicit warning and confirmation.

Deleting or replacing a key removes both storage-area copies first. Keys are not part of provider profile objects or runtime analysis messages.

## Collection and retention

OpenLeet has no backend, analytics, telemetry, error reporting, accounts, subscriptions, or history. It does not intentionally collect credentials, code, problem text, or analysis. The selected provider may process or retain requests according to its own policy. Analysis results live only in the current page's memory and are discarded on navigation/reload.

## Threat model and limitations

OpenLeet protects keys from normal LeetCode page JavaScript by keeping provider calls and key lookup in the extension service worker. It does not protect against a compromised device, malicious Chrome profile access, extension debugging access, another extension with sufficient privileges, a malicious configured endpoint, provider compromise, or transport interception on HTTP.

Use a dedicated provider key with minimum permissions, low spending/rate limits, and revocation capability. Prefer session storage and HTTPS. Use HTTP only for trusted loopback services.

Error messages are bounded and credential-like bearer/query values are removed. Arbitrary thrown errors are replaced with a generic message. No request or response bodies are logged.

## Restricted environments

OpenLeet blocks known contest, assessment, interview, exam, and test URL patterns and checks visible page wording for restricted modes. Detection is heuristic because LeetCode does not expose a stable public restriction API. Users remain responsible for following applicable rules.

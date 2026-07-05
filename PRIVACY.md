# Privacy Policy

Last updated: July 4, 2026

## Overview

OpenLeet is a browser extension that reads supported LeetCode problem pages and sends an analysis request to an AI provider configured by the user. The extension has no maintainer-operated backend or hosted inference service. Runtime requests are made directly from the browser to LeetCode and to the configured provider endpoint.

The content script is installed on `https://leetcode.com/*`. It checks the page URL and displayed page text to determine whether a page is supported or appears restricted. Analysis controls are available only on detected problem pages and are disabled on detected contest, assessment, interview, examination, and restricted-test pages. This detection is heuristic and cannot identify every restricted environment.

## Data collected by the maintainer

The extension contains no code that sends user data to the maintainer or to project-controlled infrastructure. It does not provide accounts, subscriptions, cloud synchronization, or a project-operated analysis history.

This statement does not apply to LeetCode, Chrome, an extension distribution platform, an AI provider, or a custom endpoint. Those parties may receive data as described below and operate under their own terms and privacy policies.

## Data stored locally

OpenLeet uses Chrome extension storage for:

* provider profile identifiers, display names, provider types, endpoints, model names, request timeouts, and key-storage preferences;
* the identifier of the active provider profile;
* API keys, stored separately under a profile-specific identifier.

Provider profiles, the active profile identifier, and API keys saved with **Remember in this Chrome profile** are stored in `chrome.storage.local`. API keys saved with **Keep until Chrome closes** are stored in `chrome.storage.session`.

Problem statements, editor code, LeetCode reference excerpts, and AI analysis results are not written to Chrome storage. They remain in extension memory while needed for the current page and request and are discarded when that page context is unloaded. OpenLeet does not implement an analysis-history database, request-body log, or response cache.

## LeetCode page access and reference requests

On each LeetCode page where the content script runs, OpenLeet reads the URL and displayed body text, then evaluates the first 5,000 characters of that text for route and restricted-environment detection.

After the user selects **Analyse** on a supported problem page, OpenLeet reads:

* the problem slug and title;
* the displayed problem statement, examples, and constraints;
* the selected editor language;
* the current editor code; and
* the current page URL for internal page and stale-response validation.

OpenLeet then makes two `POST` requests to `https://leetcode.com/graphql/` to request the official editorial and up to three hot community solutions for the current problem. These requests contain the GraphQL operations and the problem slug and use the user’s existing LeetCode browser credentials. The extension uses only reference content returned as viewable by LeetCode and creates bounded excerpts for analysis.

## Data sent to third-party AI providers

When the user selects **Analyse**, OpenLeet sends the following data to the active provider endpoint:

* the problem title and slug;
* the displayed problem statement, examples, and constraints;
* the selected programming language;
* the current editor code;
* bounded excerpts from accessible official-editorial and community-solution material, when available;
* OpenLeet’s analysis instructions and output schema; and
* the configured provider model identifier.

The current page URL, request identifier, profile display name, and code fingerprint are used inside the extension but are not included in the provider prompt.

If the configured endpoint requires authentication, the extension sends the API key in the provider’s required request header. It does not place the key in the request URL or analysis prompt. Selecting **Test profile** sends an authenticated `GET` request to the configured endpoint’s `/models` path; that test does not include problem text, editor code, or solution references.

## Third-party provider responsibility

Data sent to OpenAI, Anthropic, Gemini, a local model server, or another custom endpoint is subject to that provider or endpoint operator’s terms, privacy policy, security, logging, and retention practices. OpenLeet does not control how those recipients process or retain requests.

A custom endpoint receives the same analysis data and, when configured, the API key. Users are responsible for trusting the endpoint and for understanding whether a local service relays data elsewhere. Plain HTTP does not protect data or credentials from network interception and should not be used for untrusted or remote endpoints.

AI output may be inaccurate. OpenLeet validates the response structure but does not verify that the analysis is correct.

## Analytics, telemetry, and crash reporting

OpenLeet does not include analytics, telemetry, advertising trackers, or crash-reporting services. It does not intentionally send usage events or errors to the maintainer. Provider and LeetCode requests may still be logged by those recipients under their own practices.

## External website links

The extension interface does not contain outbound website links and does not add UTM parameters or other tracking parameters. Configured provider endpoints are network-request destinations, not navigation links.

## Chrome permissions

OpenLeet requests these permissions:

* `storage`: stores provider profiles, the active profile identifier, key-storage preferences, and API keys as described above.
* `https://leetcode.com/*`: runs the content script, reads supported problem and editor content, detects restricted pages, injects the editor bridge, and requests solution references from LeetCode GraphQL.
* Optional `http://*/*` and `https://*/*` host access: supports user-configured cloud, local, and custom AI endpoints. Although the manifest declares these optional patterns, OpenLeet requests runtime access only to the configured endpoint’s origin.

The content script runs on LeetCode pages outside supported problem routes so it can detect navigation and restricted routes, but it does not extract an editor or request references unless the user initiates analysis on a detected supported problem page. OpenLeet does not install content scripts on non-LeetCode websites; optional provider host access is used by the service worker for network requests.

## Network requests and destination domains

OpenLeet can make runtime requests to:

* `https://leetcode.com/graphql/` for official-editorial and community-solution references;
* `https://api.openai.com/v1` by default for OpenAI profiles;
* `https://api.anthropic.com/v1` by default for Anthropic profiles;
* `https://generativelanguage.googleapis.com/v1beta` by default for Gemini profiles; and
* any HTTP or HTTPS origin entered by the user for a custom provider, including local endpoints such as `http://localhost:11434/v1`.

Provider connection tests use `GET {endpoint}/models`. Analysis uses the applicable provider path: `POST {endpoint}/chat/completions`, `POST {endpoint}/messages`, or `POST {endpoint}/models/{model}:generateContent`. OpenLeet does not transmit runtime data to other hard-coded destinations.

## Data retention and deletion

OpenLeet itself retains profile configuration and persistent keys in `chrome.storage.local` until the user changes or deletes them. Session keys remain in `chrome.storage.session` for the Chrome extension session. LeetCode and configured providers may retain network-request data according to their own policies.

To delete data:

1. Select **Remove key** to delete both the session and persistent copies of a profile’s API key.
2. Select **Delete profile** to delete that profile and its stored API key.
3. Revoke previously granted endpoint access in Chrome’s extension site-access settings if it is no longer needed. Deleting a profile does not revoke that Chrome permission.
4. Remove OpenLeet from Chrome, or clear its extension storage with Chrome’s developer/storage tools, to remove all remaining local extension data. When the last profile is deleted, the current implementation may leave its inactive profile-selection identifier in `chrome.storage.local`; it contains no key or profile configuration.

## Changes to this policy

This policy may be updated when OpenLeet’s data handling, permissions, or provider integrations change. The date at the top identifies the latest revision. Review the current policy before using a new version of the extension.

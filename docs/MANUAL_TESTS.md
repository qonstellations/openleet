# Manual browser test checklist

Use a disposable/restricted provider key and non-contest LeetCode problems. Record Chrome version, extension commit/build, provider/model, and observed result for each run.

## Installation and page integration

1. Run `npm install && npm run verify`.
2. Load `dist/` from `chrome://extensions` with Developer mode enabled.
3. Open a normal `https://leetcode.com/problems/<slug>/` page.
4. Verify **Analyse with OpenLeet** appears after the page loads.
5. Open, close, collapse, expand, and reopen the drawer repeatedly.
6. Confirm LeetCode editor typing, selection, scrolling, shortcuts, and resizing still work.
7. Navigate to another problem using LeetCode SPA links; verify the launcher persists and old analysis is gone.
8. Reload, delay editor loading, and retry extraction. Verify useful errors for missing problem/editor information.

## Profiles and keys

1. Open settings from the toolbar and drawer.
2. Create, edit, select, and delete profiles for each supported provider type.
3. Verify the panel can switch among existing profiles and displays profile/model.
4. Save/test a profile and approve its endpoint permission. Deny once and verify the permission error.
5. Save a key with **Remember until Chrome closes**. Verify analysis works, fully exit Chrome, reopen it, and verify the key must be entered again.
6. Select persistent storage. Verify the full security warning appears before storage is enabled and cancellation prevents the change.
7. Restart Chrome and verify the persistent key still works.
8. Replace the key, then select **Remove key** and verify authenticated analysis fails cleanly.
9. Inspect the LeetCode DOM, URL, console, and content-script messages. Confirm no API key appears.
10. Delete the profile and confirm its key no longer works and no orphaned active selection breaks the UI.

## Cloud providers

For OpenAI, Anthropic, and Gemini:

1. Configure the documented endpoint, exact available model ID, and a restricted key.
2. Test the profile, then analyse a known problem with current code.
3. Verify recommended/user approach, both time/space values and derivations, comparison, confidence, and graph/fallback.
4. Test an invalid key, unavailable model, revoked endpoint permission, short timeout, and malformed-response model/proxy.
5. Verify Gemini's key does not appear in the request URL using the extension service-worker network inspector.

## Ollama

1. Start Ollama and pull/load an instruction-capable model.
2. Configure `http://localhost:11434/v1`, custom OpenAI-compatible type, exact model name, and no key.
3. Grant permission and run analysis.
4. Stop Ollama and verify the local-server-unavailable error.
5. Enter a missing model and verify the model/endpoint error.

## LM Studio

1. Load a model and start the OpenAI-compatible server.
2. Configure `http://localhost:1234/v1` (or displayed port), custom type, and exact model identifier.
3. Run analysis, then stop the server and verify the local-server error.

## Cancellation and stale responses

1. Start a slow request and select **Cancel**. Verify no result appears later.
2. Start analysis, edit code before completion, and verify the stale result is discarded.
3. Start analysis, change language before completion, and verify it is discarded.
4. Start analysis, navigate to another problem, and verify the previous result never appears.
5. Start a second request after cancel/retry and verify only its matching result is shown.

## Restricted pages

1. Open an active LeetCode contest, assessment, or interview/restricted simulation page without submitting or violating its rules.
2. Verify analysis is unavailable and a clear explanation appears.
3. Verify a normal problem page remains enabled.

## Graph and response validation

1. Mock or proxy valid responses for constant through factorial classes and confirm normalized curves render.
2. Return multiple-variable, amortised, average-case, output-sensitive, unusual, and uncertain classes; confirm explanatory fallback text replaces coordinates.
3. Return invalid JSON, missing sections, unknown enum values, and oversized fields; verify a controlled malformed-response error and retry.
4. Confirm graph labels state relative growth and not execution time.

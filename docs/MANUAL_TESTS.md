# Manual browser test checklist

Use a disposable/restricted provider key and non-contest LeetCode problems. Record Chrome version, extension commit/build, provider/model, and observed result for each run.

## Installation and page integration

1. Run `npm install && npm run verify`.
2. Load `dist/` from `chrome://extensions` with Developer mode enabled.
3. Open a normal `https://leetcode.com/problems/<slug>/` page.
4. Verify a purple **Complexity** tab is embedded beside **Test Result** or **Testcase**, with no detached launcher obscuring the page.
5. Click **Submit** and verify the embedded tab remains available as LeetCode replaces the result panel.
6. Open, close, and reopen the compact floating analysis card repeatedly.
7. Confirm the card header remains branded **OpenLeet** and the embedded capsule label remains **Complexity** while idle, loading, failed, and complete.
8. Drag the card by its header with mouse and touch/pen emulation. Verify it stays within an 8px viewport margin and header controls do not drag it.
9. Resize the card using only its bottom edge. Verify width stays 360px, normal minimum height is 280px, compressed content scrolls, and expansion stops at the content's natural height.
10. Resize the viewport and verify the card is re-clamped. On a viewport shorter than 296px, verify the available viewport height becomes the responsive minimum.
11. Confirm LeetCode editor typing, selection, scrolling, shortcuts, and resizing still work.
12. Navigate to another problem using LeetCode SPA links; verify the old analysis and window geometry are gone and the embedded tab remounts in the new result panel.
13. Reload, delay editor loading, and retry extraction. Verify useful errors for missing problem/editor information.
14. In a development build, register a temporary second tool at another DOM anchor. Verify both buttons mount independently and both windows can remain open, move, resize, and stack independently.

## Profiles and keys

1. Open settings from the toolbar and drawer.
2. Create, edit, select, and delete profiles for each supported provider type.
3. Verify the panel can switch among existing profiles and displays profile/model.
4. Save/test a profile and approve its endpoint permission. Deny once and verify the permission error.
5. Confirm successful saves, tests, key removal, and profile deletion use a green two-line status banner. Confirm validation, permission, authentication, model, and network failures use a red banner; in-progress connection testing remains purple.
6. Save a key with **Keep until Chrome closes**. Verify analysis works, fully exit Chrome, reopen it, and verify the key must be entered again.
7. Confirm **Remember in this Chrome profile** is listed first but the yellow warning remains hidden while **Keep until Chrome closes** is selected. Select persistent storage and verify the full warning appears before storage is enabled; switch back and verify it disappears.
8. Restart Chrome and verify the persistent key still works.
9. Replace the key, then select **Remove key** and verify authenticated analysis fails cleanly.
10. Inspect the LeetCode DOM, URL, console, and content-script messages. Confirm no API key appears.
11. Delete the profile and confirm its key no longer works and no orphaned active selection breaks the UI.

## Cloud providers

For OpenAI, Anthropic, and Gemini:

1. Configure the documented endpoint, exact available model ID, and a restricted key.
2. Test the profile, then analyse a known problem with current code.
3. Verify expected/implemented approach labels, both time/space values, and graph/fallback.
4. Verify the expected result follows the best accessible official editorial approach while the implemented result follows only the current editor code.
5. Test an invalid key, unavailable model, revoked endpoint permission, short timeout, and malformed-response model/proxy.
6. Verify Gemini's key does not appear in the request URL using the extension service-worker network inspector.

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

1. Mock or proxy valid responses for constant through factorial classes and confirm hybrid shape/relative-growth curves render.
2. Return multiple-variable, amortised, average-case, output-sensitive, unusual, and uncertain classes; confirm explanatory fallback text replaces coordinates.
3. Return invalid JSON, missing sections, unknown enum values, and oversized fields; verify a controlled malformed-response error and retry.
4. Compare linear and quadratic results in both compact graphs; confirm quadratic overtakes near the right with moderate separation, expected is dotted, and implementation is solid.
5. Compare identical classes and confirm their paths overlap while the expected dotted line remains visible on top.
6. Confirm constant complexity remains a low horizontal line.

## Compact result presentation

1. Confirm expected and implemented summaries each show time, space, and an approach label of at most three words.
2. Confirm the floating result remains usable at narrow viewport sizes without covering the full editor.
3. Confirm all extension accents, graph lines, controls, and focus states use the purple theme.
4. Change the code, use **Analyse again**, and verify the compact result refreshes.
5. Confirm the expected approach is concealed by default and its eye button reveals and hides only that label.
6. Leave a declaration, return statement, placeholder, quote, or bracket incomplete. Confirm OpenLeet still asks the provider; when the provider cannot classify it, both implemented metrics display **Unknown** and neither graph includes an implementation curve.
7. Confirm Expected always has a green outline; Implemented is green only when both time and space match, otherwise it has a red outline.

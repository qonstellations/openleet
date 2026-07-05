# OpenLeet

OpenLeet is a Chrome extension that helps you understand the algorithmic
complexity of your current LeetCode solution.

On a supported LeetCode problem, OpenLeet can:

- Explain the approach used by your code.
- Compare it with a recommended approach.
- Analyse time and space complexity.
- Highlight trade-offs and possible improvements.
- Show a visual comparison of supported complexity classes.

OpenLeet works with your choice of AI provider, including OpenAI, Anthropic,
Gemini, Ollama, LM Studio, and other OpenAI-compatible services. It has no
accounts, analytics, telemetry, or paid plan of its own.

## Install as an unpacked extension

You will need Chrome 116 or newer and [Node.js 20 or newer](https://nodejs.org/).

1. Download or clone this repository.
2. Open a terminal in the downloaded `openleet` folder.
3. Install the required packages and build the extension:

   ```bash
   npm install
   npm run build
   ```

4. Open `chrome://extensions` in Chrome.
5. Turn on **Developer mode** in the top-right corner.
6. Select **Load unpacked** and choose the generated `dist` folder.
7. Select the OpenLeet icon in Chrome's toolbar to configure your AI provider,
   model, and API key.

If you rebuild the extension later, select **Reload** on its card in
`chrome://extensions`, then refresh any open LeetCode tab.

## How to use OpenLeet

1. Open a regular problem page at `leetcode.com/problems/...`.
2. Write or paste your solution into the LeetCode editor.
3. Select **Analyse with OpenLeet**.
4. Wait for the analysis to appear alongside the problem.

Your problem description and code are sent to the AI provider you configure.
API keys are kept only until Chrome closes by default; persistent storage is
optional. OpenLeet is intentionally disabled on detected contest, assessment,
exam, and interview-simulation pages.

Use the extension responsibly and follow LeetCode's rules, your AI provider's
terms, and any applicable academic or interview policies. OpenLeet is an
independent project and is not affiliated with LeetCode.

## Project status

This is a personal project. I may or may not improve, update, or maintain it in
the future, so features and compatibility are not guaranteed.

See the [privacy policy](PRIVACY.md), [disclaimer](DISCLAIMER.md), and
[license](LICENSE) for more information.

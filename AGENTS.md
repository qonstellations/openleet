# Repository Guidelines

## Project Structure & Module Organization

OpenLeet is a Chrome Manifest V3 extension written in strict TypeScript. Keep code within its existing runtime boundary:

- `src/background/`: service worker, provider requests, prompts, and response parsing.
- `src/content/`: LeetCode extraction, page bridge, UI, restrictions, and graph rendering.
- `src/options/`: provider profile and key settings.
- `src/shared/`: schemas, storage, defaults, endpoints, and shared errors.
- `tests/`: Vitest suites and reusable fixtures.
- `public/`: static extension manifest and options HTML.
- `scripts/build.mjs`: esbuild-based production build.
- `docs/`: security notes and manual browser checks.

`dist/` is generated output; do not edit or commit hand-written changes there.

## Build, Test, and Development Commands

Use Node.js 20 or newer.

- `npm install`: install locked dependencies.
- `npm run typecheck`: validate TypeScript without emitting files.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: rerun affected tests during development.
- `npm run build`: create the unpackable extension in `dist/`.
- `npm run verify`: run typechecking, linting, tests, and the build in sequence.

For browser testing, build first, then load `dist/` through `chrome://extensions` in Developer mode.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, double quotes, semicolons, and ES modules. Use `camelCase` for variables/functions, `PascalCase` for types, and descriptive lowercase filenames such as `page-bridge.ts`. Keep provider credentials inside the background boundary and validate cross-context data with Zod. Avoid weakening strict compiler settings or bypassing schemas.

## Testing Guidelines

Place tests in `tests/` and name them `<feature>.test.ts`. Use Vitest globals and shared data from `tests/fixtures.ts`. Add regression coverage for parsing, schema validation, storage, provider behavior, and stale-request handling when those areas change. Run `npm run verify` before submitting. Changes affecting Chrome integration should also follow `docs/MANUAL_TESTS.md`.

## Commit & Pull Request Guidelines

The repository currently has only an `Initial commit`, so no detailed historical convention exists. Use short, imperative commit subjects, for example `Handle stale provider responses`. Keep commits focused. Pull requests should explain the behavior change, identify security or privacy impact, link relevant issues, list automated and manual checks, and include screenshots for visible options-page or content-panel changes.

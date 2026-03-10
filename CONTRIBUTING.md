# Contributing

Thanks for contributing to `YT Notes`.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the test harness:

   ```bash
   npm test
   ```

3. Load the extension in Chrome:

   - open `chrome://extensions`
   - enable `Developer mode`
   - click `Load unpacked`
   - select the repository root

## Project Rules

- Keep the extension zero-build and dependency-light unless the docs justify extra complexity.
- Put pure logic in `src/shared/` where it can be covered by tests.
- Keep boundaries explicit:
  - `src/background.js` handles activation and routing
  - `src/content/` reads page state and powers the inline drawer fallback
  - `src/sidepanel/` owns UI behavior
- Update the relevant docs in `docs/` when behavior changes.
- Run `npm test` before opening a pull request.

## Pull Requests

- Keep changes focused.
- Include a short summary of the behavior change.
- Mention any manual verification you performed.
- Add or update tests when pure logic changes.

## Packaging

To build a Chrome Web Store upload zip:

```bash
npm run package
```

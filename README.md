# YT Notes

`YT Notes` is a Chrome extension for taking notes while watching YouTube videos. It opens a focused writing surface beside the current video, saves notes per video locally, supports inline timestamps with `/t`, and exports clean Markdown when you're done.

## Features
- notes saved locally per YouTube video
- `/t` shortcut to insert the current playback timestamp at the start of a line
- clickable timestamps that seek the video
- Markdown export with video name and URL
- side panel in Chrome with an inline drawer fallback for browsers without `chrome.sidePanel`
- automatic light and dark mode based on system appearance

## Project Structure
- `manifest.json`: Chrome extension manifest.
- `src/background.js`: enables the side panel on supported YouTube pages and falls back to an inline notes drawer when needed.
- `src/content/youtube.js`: reads current YouTube playback context, seeks playback, and powers the inline notes drawer.
- `src/sidepanel/`: note-taking UI.
- `src/shared/`: pure helpers shared by the extension and tests.
- `docs/`: product, architecture, planning, and quality docs.
- `tests/`: unit tests for the pure harness.
- `scripts/validate-extension.mjs`: structural validation harness.

## Local Development
```bash
npm install
npm test
```

## Load The Extension
1. Run `npm install`.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the repository root.
6. Open any `https://www.youtube.com/watch?...` URL.
7. Click the extension action to open the side panel on that video tab.

In Chrome, `YT Notes` uses the native browser side panel. In Chromium-based browsers without `chrome.sidePanel`, it falls back to an in-page notes drawer on the right edge of the YouTube page.

## Package For Submission
```bash
npm run package
```

This creates a clean upload zip at `dist/yt-notes-v<version>.zip`.

## Repository Docs
- [AGENTS.md](./AGENTS.md): contributor and automation guardrails
- [docs/specs/extension.md](./docs/specs/extension.md): behavioral contract
- [docs/architecture.md](./docs/architecture.md): system boundaries and data flow
- [docs/quality.md](./docs/quality.md): test and manual acceptance expectations
- [docs/privacy-policy.md](./docs/privacy-policy.md): publish-ready privacy policy draft
- [docs/web-store-listing.md](./docs/web-store-listing.md): Chrome Web Store copy draft

## Notes
- Notes are stored locally in `chrome.storage.local`.
- Each video uses its YouTube video ID as the canonical note key.
- The side panel is only enabled for `youtube.com/watch?...` tabs, so it should not remain open on non-video tabs.
- The notes UI follows the system light or dark appearance preference automatically.
- Type `/t` on any note line to move the current playback timestamp to the beginning of that line.
- Click a timestamp in the note to jump the YouTube video back to that moment.
- The timestamp shortcut reads the live playback time even on already-open YouTube tabs after an extension reload.
- The panel can export the current video's note as a Markdown file.

## Open Source

The project is licensed under the [MIT License](./LICENSE). Contributions are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md).

# Quality

## Executable Harnesses

### Unit Harness
Command:

```bash
node --test
```

Coverage:
- canonical YouTube watch URL detection
- video ID extraction
- storage key generation
- timestamp shortcut transformation
- timestamp click detection
- Markdown export formatting and filename generation

### Structural Harness
Command:

```bash
node scripts/validate-extension.mjs
```

Coverage:
- required manifest fields
- required permissions
- required source files
- required operating docs

## Manual Acceptance Checks

1. Load the extension unpacked in Chrome.
2. Open a YouTube watch page and confirm the action opens the side panel.
3. Confirm the panel shows the current video title.
4. Type a note and confirm the save status updates.
5. Type `/t` on a note line and confirm the current playback timestamp is inserted at the start of that line.
6. Click inside a timestamp like `[03:12]` and confirm the video jumps to that point.
7. Click `Export` and confirm a `.md` file downloads with the export date and video title in the filename, plus the video metadata and note body inside.
8. Toggle the system appearance between light and dark mode and confirm the side panel follows it cleanly.
9. Switch to a non-watch or non-YouTube tab and confirm the side panel is no longer shown for that tab.
10. In a Chromium-based browser without `chrome.sidePanel`, confirm the action opens the inline drawer instead of failing silently and follows the same system appearance.

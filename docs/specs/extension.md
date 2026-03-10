# Extension Spec

## Product Goal

Give a YouTube viewer a fast side-panel workspace that opens while a YouTube video is playing and preserves notes per video.

## Supported Flow

1. The user opens a `youtube.com/watch` page.
2. The user activates the extension from the browser toolbar.
3. A side panel opens and identifies the active video.
4. The panel loads any existing note state for that video.
5. The user writes notes and the extension autosaves locally.
6. The user can type `/t` to stamp the current playback time onto the active line.
7. If the user revisits the same video later, the note is restored.
8. The user can export the current note as a Markdown file.

## Functional Requirements

- In browsers with `chrome.sidePanel`, the extension opens Chrome's side panel.
- In browsers without `chrome.sidePanel`, the extension opens an in-page right-side notes drawer.
- The extension activates only for YouTube watch pages with a valid `v` parameter.
- The Chrome side panel must not remain open on non-watch tabs.
- The Chrome side panel shows:
  - current video title
  - note editor
  - save status
- The notes UI should follow the system light or dark appearance preference.
- Notes autosave after the user types.
- Notes are stored in `chrome.storage.local`.
- Notes are keyed by canonical video ID.
- Typing `/t` in the note editor inserts the current playback timestamp at the beginning of the active line.
- Clicking a timestamp in the note editor seeks the current YouTube video to that timestamp.
- The timestamp shortcut must still resolve live playback time when a YouTube tab was already open before the latest extension reload.
- The inline fallback drawer may remain a simpler notes-only experience as long as it still opens reliably and preserves stored note data.
- The user can export the active note as a Markdown file with video metadata.
- The exported filename should use the export date and the video title.
- The notes UI must gracefully handle unsupported pages.

## Non-Goals

- syncing notes across browsers or devices
- exporting notes to external services
- collaborative editing
- summarization or AI note generation
- extra workspace modes beyond note-taking

## Data Contract

Each stored note record uses this shape:

```json
{
  "videoId": "abc123def45",
  "title": "Example Video Title",
  "url": "https://www.youtube.com/watch?v=abc123def45",
  "notes": "My note body",
  "updatedAt": "2026-03-09T03:12:45.000Z"
}
```

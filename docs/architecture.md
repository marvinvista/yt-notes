# Architecture

## Layers

### Background
`src/background.js`

Responsibilities:
- decide whether a tab supports the side panel
- enable or disable the side panel per tab
- respond to YouTube SPA navigation through `webNavigation`

Constraints:
- no UI rendering
- no storage writes

### Content Script
`src/content/youtube.js`

Responsibilities:
- inspect the active YouTube page
- read playback state from the page DOM
- seek the video when the notes UI requests a timestamp jump
- return lightweight video context on request
- render the inline notes drawer in browsers without side-panel support

Constraints:
- no routing decisions
- no business logic beyond page inspection and inline drawer behavior

### Side Panel
`src/sidepanel/*`

Responsibilities:
- render the note-taking experience
- fetch active tab context
- fall back to direct tab probing when the content-script message path is unavailable
- read and write notes
- map timestamp clicks in the editor to playback seeks
- expose user actions like exporting Markdown

Constraints:
- no routing decisions
- no tab eligibility logic beyond defensive checks

### Shared
`src/shared/*`

Responsibilities:
- pure helpers
- canonical URL parsing
- storage key generation
- timestamp shortcut handling and formatting
- Markdown export formatting and filename generation

Constraints:
- no direct Chrome API usage

## Data Flow

1. Chrome opens or updates a tab.
2. `background.js` evaluates the URL and enables the side panel only for supported watch pages.
3. The user clicks the extension action.
4. If the browser supports `chrome.sidePanel`, the browser side panel opens.
5. Otherwise, the background script asks the content script to toggle an inline drawer.
6. The active side-panel UI resolves current playback context and loads or saves the per-video record in `chrome.storage.local`.
7. Typing `/t` in the note editor resolves the current playback time and rewrites the active line with a timestamp prefix.
8. Clicking a timestamp in the note editor asks the content script to seek the video to that moment.

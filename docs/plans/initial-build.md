# Initial Build Plan

## Outcome

Ship a first working version of a Chrome extension that opens a YouTube-aware side panel for note-taking and is scaffolded around repo-local harnesses.

## Steps

1. Establish repo docs and implementation guardrails.
2. Implement the MV3 manifest, background routing, and content script.
3. Build the side panel UI and autosave flow.
4. Add pure-function tests and a repo validation script.
5. Run the harness and keep docs aligned with the delivered behavior.

## Risks

- YouTube uses SPA navigation, so panel eligibility must react to history changes.
- Side panel code must degrade gracefully when no content-script context is available.
- Chrome extension APIs are async and stateful, so the UI should avoid stale-tab assumptions.

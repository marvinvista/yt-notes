# AGENTS.md

## System Of Record
- `README.md`: high-level product overview and setup.
- `docs/specs/extension.md`: behavioral contract for the extension.
- `docs/architecture.md`: component boundaries and data flow.
- `docs/plans/initial-build.md`: current implementation plan and change decomposition.
- `docs/quality.md`: validation harnesses and acceptance checks.

## Golden Principles
- Keep the extension zero-build and dependency-light unless the repo docs explicitly justify more complexity.
- Keep business logic pure where possible. URL parsing, timestamp formatting, and storage key generation belong in `src/shared/` and must be testable with Node.
- Keep boundaries strict:
  - `src/background.js` manages activation and routing only.
  - `src/content/` inspects YouTube state only.
  - `src/sidepanel/` owns presentation and user interaction only.
- Persist notes by canonical YouTube video ID so the same note follows the same video.
- Any behavior change must update the relevant doc in `docs/` and either the unit tests or the validation harness.

## Working Loop
1. Read the spec and architecture docs before changing behavior.
2. Implement the smallest useful change inside the correct boundary.
3. Run `npm test`.
4. Update docs if the behavior or constraints changed.

## Definition Of Done
- The side panel opens from the extension action on YouTube watch pages.
- If browser side panels are unavailable, the extension opens an inline notes drawer instead.
- The panel loads the active video's metadata and saved note state.
- Notes autosave locally and restore when the same video is revisited.
- The user can export the current video's notes as Markdown.
- `npm test` passes.

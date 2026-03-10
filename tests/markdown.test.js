import test from "node:test";
import assert from "node:assert/strict";

import { buildMarkdownExport, markdownFilename } from "../src/shared/markdown.js";

test("builds a markdown export with metadata and timestamp bullets", () => {
  const markdown = buildMarkdownExport(
    {
      videoId: "l_FI_80WiwU",
      title: "Lessons from Building a New AI Product at Ramp",
      url: "https://www.youtube.com/watch?v=l_FI_80WiwU",
      updatedAt: "2026-03-09T03:12:45.000Z",
      notes: "[00:15] Why the team shipped fast\nKey takeaway\n\n[01:42] What changed"
    },
    {
      exportedAt: "2026-03-09T04:00:00.000Z"
    }
  );

  assert.match(markdown, /^# Lessons from Building a New AI Product at Ramp/m);
  assert.match(markdown, /- Video Name: Lessons from Building a New AI Product at Ramp/);
  assert.match(markdown, /- Video URL: <https:\/\/www\.youtube\.com\/watch\?v=l_FI_80WiwU>/);
  assert.match(markdown, /- \*\*00:15\*\* Why the team shipped fast/);
  assert.match(markdown, /^Key takeaway$/m);
  assert.match(markdown, /- Exported: 2026-03-09T04:00:00.000Z/);
});

test("returns a placeholder when the note body is empty", () => {
  const markdown = buildMarkdownExport({
    videoId: "abc123def45",
    title: "Example video",
    notes: "   "
  });

  assert.match(markdown, /## Notes\n\n_No notes captured yet\._/);
});

test("creates a stable markdown filename", () => {
  assert.equal(
    markdownFilename({
      title: "Lessons from Building a New AI Product at Ramp",
      videoId: "l_FI_80WiwU"
    }, {
      exportedAt: "2026-03-09T04:00:00.000Z"
    }),
    "2026-03-09-lessons-from-building-a-new-ai-product-at-ramp.md"
  );
});

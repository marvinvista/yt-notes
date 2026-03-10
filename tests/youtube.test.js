import test from "node:test";
import assert from "node:assert/strict";

import {
  formatTimestamp,
  getVideoIdFromUrl,
  isYouTubeWatchUrl,
  noteStorageKey,
  parseTimestamp
} from "../src/shared/youtube.js";

test("detects canonical YouTube watch URLs", () => {
  assert.equal(isYouTubeWatchUrl("https://www.youtube.com/watch?v=abc123def45"), true);
  assert.equal(isYouTubeWatchUrl("https://youtube.com/watch?v=abc123def45&t=90"), true);
});

test("rejects unsupported YouTube URLs", () => {
  assert.equal(isYouTubeWatchUrl("https://www.youtube.com/results?search_query=test"), false);
  assert.equal(isYouTubeWatchUrl("https://youtu.be/abc123def45"), false);
  assert.equal(isYouTubeWatchUrl("not a url"), false);
});

test("extracts the canonical video ID", () => {
  assert.equal(getVideoIdFromUrl("https://www.youtube.com/watch?v=abc123def45&list=playlist"), "abc123def45");
});

test("returns null when no canonical video ID exists", () => {
  assert.equal(getVideoIdFromUrl("https://www.youtube.com/watch?list=playlist"), null);
  assert.equal(getVideoIdFromUrl("https://www.youtube.com/shorts/abc123def45"), null);
});

test("creates stable storage keys", () => {
  assert.equal(noteStorageKey("abc123def45"), "yt-notes:video:abc123def45");
});

test("formats playback timestamps for notes", () => {
  assert.equal(formatTimestamp(15), "00:15");
  assert.equal(formatTimestamp(3723), "01:02:03");
});

test("parses note timestamps back into seconds", () => {
  assert.equal(parseTimestamp("03:12"), 192);
  assert.equal(parseTimestamp("01:02:03"), 3723);
  assert.equal(parseTimestamp("bad"), null);
});

import test from "node:test";
import assert from "node:assert/strict";

import { applyTimestampShortcut, getTimestampAtSelection, hasTimestampShortcut } from "../src/shared/editor.js";

test("detects the /t timestamp shortcut on the active line", () => {
  const value = "Key idea /t";
  assert.equal(hasTimestampShortcut(value, value.length), true);
});

test("moves the timestamp to the beginning of the line", () => {
  const value = "Key idea /t";
  const result = applyTimestampShortcut(value, value.length, "03:12");

  assert.equal(result.handled, true);
  assert.equal(result.value, "[03:12] Key idea");
  assert.equal(result.selectionStart, result.value.length);
});

test("adds a fresh timestamp to an empty line", () => {
  const value = "/t";
  const result = applyTimestampShortcut(value, value.length, "00:15");

  assert.equal(result.handled, true);
  assert.equal(result.value, "[00:15] ");
});

test("refreshes the line timestamp when one already exists", () => {
  const value = "[00:10] Key idea /t";
  const result = applyTimestampShortcut(value, value.length, "03:12");

  assert.equal(result.handled, true);
  assert.equal(result.value, "[03:12] Key idea");
});

test("finds a clickable timestamp when the caret lands inside it", () => {
  const value = "[03:12] Key idea";
  const result = getTimestampAtSelection(value, 4);

  assert.deepEqual(result, {
    label: "03:12",
    seconds: 192,
    selectionStart: 0,
    selectionEnd: 7
  });
});

test("ignores clicks outside the timestamp token", () => {
  const value = "[03:12] Key idea";
  assert.equal(getTimestampAtSelection(value, value.length), null);
});

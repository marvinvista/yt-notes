import { parseTimestamp } from "./youtube.js";

const TIMESTAMP_COMMAND = "/t";
const TIMESTAMP_PREFIX_PATTERN = /^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*/;

export function hasTimestampShortcut(value, selectionStart, selectionEnd = selectionStart) {
  return Boolean(findTimestampShortcut(value, selectionStart, selectionEnd));
}

export function applyTimestampShortcut(value, selectionStart, timestampLabel, selectionEnd = selectionStart) {
  const match = findTimestampShortcut(value, selectionStart, selectionEnd);

  if (!match || !timestampLabel) {
    return {
      handled: false,
      value,
      selectionStart,
      selectionEnd
    };
  }

  const currentLine = value.slice(match.lineStart, match.lineEnd);
  const relativeCommandStart = match.commandStart - match.lineStart;
  const relativeCommandEnd = match.commandEnd - match.lineStart;
  const lineWithoutCommand = `${currentLine.slice(0, relativeCommandStart)}${currentLine.slice(relativeCommandEnd)}`;
  const lineBody = lineWithoutCommand
    .replace(TIMESTAMP_PREFIX_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  const nextLine = lineBody ? `[${timestampLabel}] ${lineBody}` : `[${timestampLabel}] `;
  const nextValue = `${value.slice(0, match.lineStart)}${nextLine}${value.slice(match.lineEnd)}`;
  const nextCaret = match.lineStart + nextLine.length;

  return {
    handled: true,
    value: nextValue,
    selectionStart: nextCaret,
    selectionEnd: nextCaret
  };
}

export function getTimestampAtSelection(value, selectionStart, selectionEnd = selectionStart) {
  if (typeof value !== "string") {
    return null;
  }

  const safeSelectionStart = Number.isInteger(selectionStart) ? selectionStart : value.length;
  const safeSelectionEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeSelectionStart;

  if (safeSelectionStart !== safeSelectionEnd) {
    return null;
  }

  const { lineStart, lineEnd } = getLineBounds(value, safeSelectionStart);
  const currentLine = value.slice(lineStart, lineEnd);
  const match = currentLine.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]/);

  if (!match) {
    return null;
  }

  const label = match[1];
  const seconds = parseTimestamp(label);
  const tokenStart = lineStart;
  const tokenEnd = lineStart + match[0].length;

  if (seconds === null || safeSelectionStart < tokenStart || safeSelectionStart > tokenEnd) {
    return null;
  }

  return {
    label,
    seconds,
    selectionStart: tokenStart,
    selectionEnd: tokenEnd
  };
}

function findTimestampShortcut(value, selectionStart, selectionEnd) {
  if (typeof value !== "string") {
    return null;
  }

  const safeSelectionStart = Number.isInteger(selectionStart) ? selectionStart : value.length;
  const safeSelectionEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeSelectionStart;

  if (safeSelectionStart !== safeSelectionEnd) {
    return null;
  }

  const { lineStart, lineEnd } = getLineBounds(value, safeSelectionStart);
  const currentLine = value.slice(lineStart, lineEnd);
  const caretInLine = safeSelectionStart - lineStart;
  const commandIndex = currentLine.lastIndexOf(TIMESTAMP_COMMAND, caretInLine);

  if (commandIndex === -1) {
    return null;
  }

  const commandEnd = commandIndex + TIMESTAMP_COMMAND.length;

  if (commandEnd > caretInLine) {
    return null;
  }

  const beforeChar = currentLine[commandIndex - 1];
  const afterChar = currentLine[commandEnd];

  if (beforeChar && !/\s/.test(beforeChar)) {
    return null;
  }

  if (afterChar && !/\s/.test(afterChar) && commandEnd !== caretInLine) {
    return null;
  }

  return {
    lineStart,
    lineEnd,
    commandStart: lineStart + commandIndex,
    commandEnd: lineStart + commandEnd
  };
}

function getLineBounds(value, caretPosition) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, caretPosition - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", caretPosition);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  return {
    lineStart,
    lineEnd
  };
}

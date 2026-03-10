chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "yt-notes:get-video-context") {
    sendResponse(getVideoContext());
    return false;
  }

  if (message?.type === "yt-notes:seek-video") {
    sendResponse({ ok: seekVideo(message.seconds) });
    return false;
  }

  if (message?.type === "yt-notes:toggle-inline-panel") {
    void toggleInlinePanel()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error("Failed to toggle inline YT Notes panel.", error);
        sendResponse({ ok: false, error: error.message });
      });

    return true;
  }

  return undefined;
});

const NOTE_KEY_PREFIX = "yt-notes:video:";
const ROOT_ID = "yt-notes-inline-root";

const inlineState = {
  currentVideoId: null,
  elements: null,
  root: null,
  saveTimer: null
};

window.addEventListener("yt-navigate-finish", () => {
  if (inlineState.root) {
    void hydrateInlinePanel().catch(handleExtensionContextError);
  }
});

function getVideoContext() {
  const url = new URL(window.location.href);
  const titleElement = document.querySelector("ytd-watch-metadata h1 yt-formatted-string");
  const videoElement = document.querySelector("video");
  const videoId = isWatchPageUrl(url) ? url.searchParams.get("v") : null;

  return {
    videoId: videoId && videoId.trim() ? videoId.trim() : null,
    url: url.toString(),
    title: titleElement?.textContent?.trim() || cleanTitle(document.title) || "Untitled video",
    currentTime: Number.isFinite(videoElement?.currentTime) ? Math.floor(videoElement.currentTime) : 0,
    duration: Number.isFinite(videoElement?.duration) ? Math.floor(videoElement.duration) : 0
  };
}

function seekVideo(seconds) {
  const videoElement = document.querySelector("video");

  if (!videoElement || !Number.isFinite(seconds)) {
    return false;
  }

  videoElement.currentTime = Math.max(0, seconds);
  return true;
}

async function toggleInlinePanel() {
  if (inlineState.root) {
    disposeInlinePanel();
    return;
  }

  createInlinePanel();
  await hydrateInlinePanel();
}

function createInlinePanel() {
  const root = document.createElement("div");
  root.id = ROOT_ID;
  const shadow = root.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        color-scheme: light dark;
        --paper: #ffffff;
        --ink: #1f2430;
        --muted: #7a7f89;
        --line: rgba(15, 23, 42, 0.08);
        --button: #152238;
        --button-text: #fff8ed;
        --close-surface: rgba(21, 34, 56, 0.12);
        --shadow: -18px 0 40px rgba(15, 23, 42, 0.08);
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --paper: #10161d;
          --ink: #eef2f7;
          --muted: #a4afbb;
          --line: rgba(226, 232, 240, 0.14);
          --button: #eef2f7;
          --button-text: #10161d;
          --close-surface: rgba(255, 255, 255, 0.12);
          --shadow: -18px 0 40px rgba(0, 0, 0, 0.45);
        }
      }

      .shell {
        position: fixed;
        top: 0;
        right: 0;
        width: min(390px, 92vw);
        height: 100vh;
        z-index: 2147483647;
        display: grid;
        grid-template-rows: minmax(0, 1fr);
        padding: 14px 14px 12px;
        box-sizing: border-box;
        color: var(--ink);
        background: var(--paper);
        font-family: Roboto, Arial, sans-serif;
        box-shadow: var(--shadow);
        border-left: 1px solid var(--line);
      }

      .workspace {
        min-height: 0;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto auto;
        gap: 10px;
      }

      h2 {
        margin: 0;
        font-family: Roboto, Arial, sans-serif;
        font-weight: 600;
        font-size: 19px;
        line-height: 1.08;
        letter-spacing: -0.025em;
      }

      .video-header {
        position: relative;
        display: grid;
        padding-right: 42px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--line);
      }

      .close {
        position: absolute;
        top: 0;
        right: 0;
        appearance: none;
        border: 0;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: var(--close-surface);
        color: var(--ink);
        font: inherit;
        font-size: 18px;
        cursor: pointer;
      }

      .editor {
        width: 100%;
        min-height: 0;
        resize: none;
        padding: 2px 0 0;
        color: var(--ink);
        font-family: Roboto, Arial, sans-serif;
        font-size: 16px;
        line-height: 1.9;
        outline: none;
        border: 0;
        box-shadow: none;
        background: transparent;
      }

      .status-row {
        display: flex;
        justify-content: flex-end;
        min-height: 16px;
      }

      .save-state {
        color: var(--muted);
        font-family: Roboto, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
      }

      .actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        padding-top: 2px;
      }

      .button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: var(--button);
        color: var(--button-text);
        font-family: Roboto, Arial, sans-serif;
        font-size: 13px;
        font-weight: 700;
        padding: 10px 14px;
        cursor: pointer;
      }

      .button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    </style>
    <aside class="shell" aria-label="YT Notes">
      <section class="workspace">
        <div class="video-header">
          <h2 id="yt-notes-title">No active video</h2>
          <button class="close" id="yt-notes-close" type="button" aria-label="Close notes">×</button>
        </div>
        <textarea id="yt-notes-editor" class="editor"></textarea>
        <div class="status-row">
          <div class="save-state" id="yt-notes-save-state">Nothing to save yet.</div>
        </div>
        <section class="actions">
          <button class="button" id="yt-notes-export" type="button">Export</button>
        </section>
      </section>
    </aside>
  `;

  document.documentElement.append(root);

  const elements = {
    close: shadow.querySelector("#yt-notes-close"),
    editor: shadow.querySelector("#yt-notes-editor"),
    exportMarkdown: shadow.querySelector("#yt-notes-export"),
    saveState: shadow.querySelector("#yt-notes-save-state"),
    title: shadow.querySelector("#yt-notes-title")
  };

  elements.close.addEventListener("click", () => {
    disposeInlinePanel();
  });

  elements.editor.addEventListener("input", () => {
    if (!inlineState.currentVideoId) {
      return;
    }

    handleInlineInput();
  });

  elements.editor.addEventListener("click", () => {
    if (!inlineState.currentVideoId) {
      return;
    }

    handleInlineTimestampClick();
  });

  elements.exportMarkdown.addEventListener("click", () => {
    void exportInlineMarkdown();
  });

  inlineState.root = root;
  inlineState.elements = elements;
  elements.editor.disabled = true;
  elements.exportMarkdown.disabled = true;
}

function disposeInlinePanel() {
  window.clearTimeout(inlineState.saveTimer);
  inlineState.saveTimer = null;
  inlineState.currentVideoId = null;
  inlineState.elements = null;
  inlineState.root?.remove();
  inlineState.root = null;
}

async function hydrateInlinePanel() {
  const context = getVideoContext();
  const videoId = context.videoId;

  if (!videoId) {
    renderInlineUnsupported("Open a YouTube watch page to use YT Notes.");
    return;
  }

  inlineState.currentVideoId = videoId;
  inlineState.elements.title.textContent = context.title || "Untitled video";
  inlineState.elements.editor.disabled = false;
  inlineState.elements.exportMarkdown.disabled = false;

  const key = noteStorageKey(videoId);
  const stored = await safeStorageGet(key);
  const record = stored?.[key];
  inlineState.elements.editor.value = record?.notes || "";

  if (record?.updatedAt) {
    setInlineSaveState(`Saved ${new Date(record.updatedAt).toLocaleString()}`);
    return;
  }

  setInlineSaveState("Start typing to save notes for this video.");
}

function renderInlineUnsupported(message) {
  inlineState.currentVideoId = null;
  inlineState.elements.title.textContent = "No active video";
  inlineState.elements.editor.value = "";
  inlineState.elements.editor.disabled = true;
  inlineState.elements.exportMarkdown.disabled = true;
  setInlineSaveState(message);
}

function handleInlineInput() {
  const selectionStart = inlineState.elements.editor.selectionStart ?? inlineState.elements.editor.value.length;
  const selectionEnd = inlineState.elements.editor.selectionEnd ?? selectionStart;

  if (hasTimestampShortcut(inlineState.elements.editor.value, selectionStart, selectionEnd)) {
    const timestampLabel = formatTimestamp(getVideoContext().currentTime);
    const result = applyTimestampShortcut(
      inlineState.elements.editor.value,
      inlineState.elements.editor.selectionStart ?? inlineState.elements.editor.value.length,
      timestampLabel,
      inlineState.elements.editor.selectionEnd ?? inlineState.elements.editor.selectionStart ?? inlineState.elements.editor.value.length
    );

    if (result.handled) {
      inlineState.elements.editor.value = result.value;
      inlineState.elements.editor.setSelectionRange(result.selectionStart, result.selectionEnd);
    }
  }

  scheduleInlinePersist();
}

function handleInlineTimestampClick() {
  const match = getTimestampAtSelection(
    inlineState.elements.editor.value,
    inlineState.elements.editor.selectionStart ?? inlineState.elements.editor.value.length,
    inlineState.elements.editor.selectionEnd ?? inlineState.elements.editor.selectionStart ?? inlineState.elements.editor.value.length
  );

  if (!match) {
    return;
  }

  seekVideo(match.seconds);
}

async function persistInlineNote() {
  if (!inlineState.currentVideoId) {
    return null;
  }

  const record = buildInlineRecord();
  const stored = await safeStorageSet({
    [noteStorageKey(inlineState.currentVideoId)]: record
  });

  if (!stored) {
    return null;
  }

  setInlineSaveState(`Saved ${new Date(record.updatedAt).toLocaleString()}`);
  return record;
}

function setInlineSaveState(message) {
  inlineState.elements.saveState.textContent = message;
}

async function exportInlineMarkdown() {
  if (!inlineState.currentVideoId) {
    return;
  }

  window.clearTimeout(inlineState.saveTimer);
  const record = await persistInlineNote();

  if (!record) {
    return;
  }

  const exportedAt = new Date().toISOString();
  const filename = markdownFilename(record, exportedAt);
  const markdown = buildMarkdownExport(record, exportedAt);

  downloadTextFile(filename, markdown);
  setInlineSaveState("Markdown exported.");
}

function noteStorageKey(videoId) {
  return `${NOTE_KEY_PREFIX}${videoId}`;
}

function buildInlineRecord() {
  const context = getVideoContext();

  return {
    videoId: inlineState.currentVideoId,
    title: context.title,
    url: context.url,
    notes: inlineState.elements.editor.value,
    updatedAt: new Date().toISOString()
  };
}

function scheduleInlinePersist() {
  window.clearTimeout(inlineState.saveTimer);
  setInlineSaveState("Saving...");
  inlineState.saveTimer = window.setTimeout(() => {
    void persistInlineNote().catch(handleExtensionContextError);
  }, 250);
}

function buildMarkdownExport(record, exportedAtValue) {
  const videoId = cleanSingleLine(record?.videoId) || "unknown-video";
  const title = cleanSingleLine(record?.title) || `YouTube Notes ${videoId}`;
  const url = cleanSingleLine(record?.url);
  const updatedAt = cleanSingleLine(record?.updatedAt);
  const exportedAt = cleanSingleLine(exportedAtValue) || new Date().toISOString();
  const notes = formatMarkdownNotes(record?.notes);
  const lines = [`# ${title}`, "", `- Video Name: ${title}`];

  if (url) {
    lines.push(`- Video URL: <${url}>`);
  }

  if (updatedAt) {
    lines.push(`- Last saved: ${updatedAt}`);
  }

  lines.push(`- Exported: ${exportedAt}`, "", "## Notes", "", notes);

  return `${lines.join("\n").trimEnd()}\n`;
}

function markdownFilename(record, exportedAtValue) {
  const datePart = formatFilenameDate(cleanSingleLine(exportedAtValue) || new Date().toISOString());
  const titlePart = slugify(cleanSingleLine(record?.title) || "yt-notes");

  return `${datePart}-${titlePart}.md`;
}

function formatMarkdownNotes(notes) {
  const normalized = typeof notes === "string" ? notes.replace(/\r\n/g, "\n").trim() : "";

  if (!normalized) {
    return "_No notes captured yet._";
  }

  return normalized
    .split("\n")
    .map((line) => {
      if (!line.trim()) {
        return "";
      }

      const timestampMatch = line.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);

      if (timestampMatch) {
        const [, timestamp, body] = timestampMatch;
        return body ? `- **${timestamp}** ${body}` : `- **${timestamp}**`;
      }

      return line;
    })
    .join("\n");
}

function cleanSingleLine(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function slugify(value) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "yt-notes";
}

function formatFilenameDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "undated";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hasTimestampShortcut(value, selectionStart, selectionEnd = selectionStart) {
  return Boolean(findTimestampShortcut(value, selectionStart, selectionEnd));
}

function applyTimestampShortcut(value, selectionStart, timestampLabel, selectionEnd = selectionStart) {
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
    .replace(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*/, "")
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

function findTimestampShortcut(value, selectionStart, selectionEnd) {
  if (typeof value !== "string") {
    return null;
  }

  const safeSelectionStart = Number.isInteger(selectionStart) ? selectionStart : value.length;
  const safeSelectionEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeSelectionStart;

  if (safeSelectionStart !== safeSelectionEnd) {
    return null;
  }

  const lineStart = value.lastIndexOf("\n", Math.max(0, safeSelectionStart - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", safeSelectionStart);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const currentLine = value.slice(lineStart, lineEnd);
  const caretInLine = safeSelectionStart - lineStart;
  const commandIndex = currentLine.lastIndexOf("/t", caretInLine);

  if (commandIndex === -1) {
    return null;
  }

  const commandEnd = commandIndex + 2;

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

function getTimestampAtSelection(value, selectionStart, selectionEnd = selectionStart) {
  if (typeof value !== "string") {
    return null;
  }

  const safeSelectionStart = Number.isInteger(selectionStart) ? selectionStart : value.length;
  const safeSelectionEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeSelectionStart;

  if (safeSelectionStart !== safeSelectionEnd) {
    return null;
  }

  const lineStart = value.lastIndexOf("\n", Math.max(0, safeSelectionStart - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", safeSelectionStart);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
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

function formatTimestamp(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseTimestamp(label) {
  if (typeof label !== "string" || !/^\d{2}:\d{2}(?::\d{2})?$/.test(label)) {
    return null;
  }

  const parts = label.split(":").map((value) => Number.parseInt(value, 10));

  if (parts.some((value) => !Number.isInteger(value) || value < 0)) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], {
    type: "text/markdown;charset=utf-8"
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.documentElement.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function isWatchPageUrl(url) {
  return url.pathname === "/watch" && Boolean(url.searchParams.get("v"));
}

function cleanTitle(title) {
  return title?.replace(/\s+-\s+YouTube$/, "").trim() || "";
}

async function safeStorageGet(key) {
  try {
    return await chrome.storage.local.get(key);
  } catch (error) {
    handleExtensionContextError(error);
    return {};
  }
}

async function safeStorageSet(value) {
  try {
    await chrome.storage.local.set(value);
    return true;
  } catch (error) {
    handleExtensionContextError(error);
    return false;
  }
}

function handleExtensionContextError(error) {
  if (isExtensionContextInvalidated(error)) {
    disposeInlinePanel();
    return;
  }

  if (error) {
    console.error(error);
  }
}

function isExtensionContextInvalidated(error) {
  return typeof error?.message === "string" && error.message.includes("Extension context invalidated");
}

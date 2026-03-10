import { applyTimestampShortcut, getTimestampAtSelection, hasTimestampShortcut } from "../shared/editor.js";
import { buildMarkdownExport, markdownFilename } from "../shared/markdown.js";
import { formatTimestamp, getVideoIdFromUrl, isYouTubeWatchUrl, noteStorageKey } from "../shared/youtube.js";

const elements = {
  exportMarkdown: document.querySelector("#export-markdown"),
  noteEditor: document.querySelector("#note-editor"),
  saveState: document.querySelector("#save-state"),
  videoTitle: document.querySelector("#video-title")
};

const state = {
  activeTabId: null,
  activeTitle: null,
  activeUrl: null,
  activeVideoId: null,
  noteStatusMessage: "Nothing to save yet.",
  record: createEmptyRecord(),
  saveTimer: null
};

boot().catch((error) => {
  console.error("Failed to initialize YT Notes side panel.", error);
  renderUnsupportedState("The side panel could not read the current tab.");
});

chrome.tabs.onActivated.addListener(() => {
  void refreshFromActiveTab();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    void refreshFromActiveTab();
  }
});

elements.noteEditor.addEventListener("input", () => {
  if (!state.activeVideoId) {
    return;
  }

  void handleNoteInput();
});

elements.noteEditor.addEventListener("click", () => {
  if (!state.activeVideoId) {
    return;
  }

  void handleTimestampClick();
});

elements.exportMarkdown.addEventListener("click", () => {
  void exportMarkdown();
});

async function boot() {
  elements.exportMarkdown.disabled = true;
  elements.noteEditor.disabled = true;
  await refreshFromActiveTab();
}

async function refreshFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (!tab?.id || !tab.url || !isYouTubeWatchUrl(tab.url)) {
    renderUnsupportedState("Open a YouTube watch page, then click the extension action.");
    return;
  }

  const contentContext = await readContentContext(tab.id);
  const videoId = contentContext?.videoId || getVideoIdFromUrl(tab.url);

  if (!videoId) {
    renderUnsupportedState("This page does not expose a usable YouTube video ID.");
    return;
  }

  state.activeTabId = tab.id;
  state.activeVideoId = videoId;
  state.activeUrl = contentContext?.url || tab.url;
  state.activeTitle = contentContext?.title || cleanTitle(tab.title) || "Untitled video";

  renderVideoState();
  await loadRecord();
}

async function readContentContext(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "yt-notes:get-video-context" });
  } catch {
    return await readContextFromPage(tabId);
  }
}

function renderUnsupportedState(message) {
  window.clearTimeout(state.saveTimer);
  state.saveTimer = null;
  state.activeTabId = null;
  state.activeTitle = null;
  state.activeUrl = null;
  state.activeVideoId = null;
  state.record = createEmptyRecord();
  elements.videoTitle.textContent = "No active video";
  elements.noteEditor.value = "";
  elements.noteEditor.disabled = true;
  elements.exportMarkdown.disabled = true;
  setNoteStatus(message);
}

function renderVideoState() {
  elements.videoTitle.textContent = state.activeTitle;
  elements.noteEditor.disabled = false;
  elements.exportMarkdown.disabled = false;
  renderFooterStatus();
}

async function loadRecord() {
  const key = noteStorageKey(state.activeVideoId);
  const stored = await chrome.storage.local.get(key);

  state.record = normalizeRecord(stored[key]);
  elements.noteEditor.value = state.record.notes;

  if (state.record.updatedAt) {
    setNoteStatus(`Saved ${new Date(state.record.updatedAt).toLocaleString()}`);
    return;
  }

  setNoteStatus("Start typing to save notes for this video.");
}

async function handleNoteInput() {
  const selectionStart = elements.noteEditor.selectionStart ?? elements.noteEditor.value.length;
  const selectionEnd = elements.noteEditor.selectionEnd ?? selectionStart;

  if (hasTimestampShortcut(elements.noteEditor.value, selectionStart, selectionEnd)) {
    const timestampLabel = await readCurrentTimestampLabel();
    const result = applyTimestampShortcut(
      elements.noteEditor.value,
      elements.noteEditor.selectionStart ?? elements.noteEditor.value.length,
      timestampLabel,
      elements.noteEditor.selectionEnd ?? elements.noteEditor.selectionStart ?? elements.noteEditor.value.length
    );

    if (result.handled) {
      elements.noteEditor.value = result.value;
      elements.noteEditor.setSelectionRange(result.selectionStart, result.selectionEnd);
    }
  }

  schedulePersist();
}

async function handleTimestampClick() {
  const match = getTimestampAtSelection(
    elements.noteEditor.value,
    elements.noteEditor.selectionStart ?? elements.noteEditor.value.length,
    elements.noteEditor.selectionEnd ?? elements.noteEditor.selectionStart ?? elements.noteEditor.value.length
  );

  if (!match || !state.activeTabId) {
    return;
  }

  await seekVideoToTimestamp(state.activeTabId, match.seconds);
}

async function persistNote() {
  if (!state.activeVideoId) {
    return null;
  }

  const nextRecord = buildRecordSnapshot({
    updatedAt: new Date().toISOString()
  });

  await chrome.storage.local.set({
    [noteStorageKey(state.activeVideoId)]: nextRecord
  });

  state.record = normalizeRecord(nextRecord);
  setNoteStatus(`Saved ${new Date(nextRecord.updatedAt).toLocaleString()}`);
  return nextRecord;
}

async function exportMarkdown() {
  if (!state.activeVideoId) {
    return;
  }

  window.clearTimeout(state.saveTimer);
  const record = await persistNote();

  if (!record) {
    return;
  }

  const exportedAt = new Date().toISOString();
  const filename = markdownFilename(record, { exportedAt });
  const markdown = buildMarkdownExport(record, { exportedAt });

  downloadTextFile(filename, markdown);
  setNoteStatus("Markdown exported.");
}

async function readCurrentTimestampLabel() {
  if (!state.activeTabId) {
    return formatTimestamp(0);
  }

  const context = await readContentContext(state.activeTabId);
  return formatTimestamp(context?.currentTime ?? 0);
}

async function readContextFromPage(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const url = new URL(window.location.href);
        const titleElement = document.querySelector("ytd-watch-metadata h1 yt-formatted-string");
        const videoElement = document.querySelector("video");

        return {
          videoId: url.searchParams.get("v"),
          url: url.toString(),
          title: titleElement?.textContent?.trim() || document.title.replace(/\s+-\s+YouTube$/, ""),
          currentTime: Number.isFinite(videoElement?.currentTime) ? Math.floor(videoElement.currentTime) : 0,
          duration: Number.isFinite(videoElement?.duration) ? Math.floor(videoElement.duration) : 0
        };
      }
    });

    return result?.result || null;
  } catch {
    return null;
  }
}

async function seekVideoToTimestamp(tabId, seconds) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "yt-notes:seek-video",
      seconds
    });

    if (response?.ok) {
      return true;
    }
  } catch {
    // Fall through to direct page probing when the content script is stale.
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [seconds],
      func: (nextSeconds) => {
        const videoElement = document.querySelector("video");

        if (!videoElement || !Number.isFinite(nextSeconds)) {
          return false;
        }

        videoElement.currentTime = Math.max(0, nextSeconds);
        return true;
      }
    });

    return result?.result === true;
  } catch {
    return false;
  }
}

function schedulePersist() {
  window.clearTimeout(state.saveTimer);
  setNoteStatus("Saving...");
  state.saveTimer = window.setTimeout(() => {
    void persistNote();
  }, 250);
}

function buildRecordSnapshot(overrides = {}) {
  return normalizeRecord({
    ...state.record,
    videoId: state.activeVideoId,
    title: state.activeTitle,
    url: state.activeUrl,
    notes: elements.noteEditor.value,
    ...overrides
  });
}

function setNoteStatus(message) {
  state.noteStatusMessage = message;
  renderFooterStatus();
}

function renderFooterStatus() {
  elements.saveState.textContent = state.noteStatusMessage;
}

function normalizeRecord(value) {
  if (!value || typeof value !== "object") {
    return createEmptyRecord();
  }

  return {
    videoId: typeof value.videoId === "string" ? value.videoId : state.activeVideoId,
    title: typeof value.title === "string" ? value.title : state.activeTitle,
    url: typeof value.url === "string" ? value.url : state.activeUrl,
    notes: typeof value.notes === "string" ? value.notes : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null
  };
}

function createEmptyRecord() {
  return {
    videoId: null,
    title: null,
    url: null,
    notes: "",
    updatedAt: null
  };
}

function cleanTitle(title) {
  return typeof title === "string" ? title.replace(/\s+-\s+YouTube$/, "").trim() : "";
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

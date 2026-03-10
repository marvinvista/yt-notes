const YOUTUBE_WATCH_PATH = "/watch";
const NOTE_KEY_PREFIX = "yt-notes:video:";

export function isYouTubeWatchUrl(input) {
  const url = normalizeUrl(input);

  if (!url) {
    return false;
  }

  return isYouTubeHost(url.hostname) && url.pathname === YOUTUBE_WATCH_PATH && Boolean(url.searchParams.get("v"));
}

export function getVideoIdFromUrl(input) {
  const url = normalizeUrl(input);

  if (!url || !isYouTubeHost(url.hostname) || url.pathname !== YOUTUBE_WATCH_PATH) {
    return null;
  }

  const videoId = url.searchParams.get("v");

  return videoId && videoId.trim() ? videoId.trim() : null;
}

export function noteStorageKey(videoId) {
  return `${NOTE_KEY_PREFIX}${videoId}`;
}

export function formatTimestamp(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseTimestamp(label) {
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

function normalizeUrl(input) {
  if (input instanceof URL) {
    return input;
  }

  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function isYouTubeHost(hostname) {
  return hostname === "www.youtube.com" || hostname === "youtube.com";
}

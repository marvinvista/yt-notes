export function buildMarkdownExport(record, options = {}) {
  const videoId = cleanSingleLine(record?.videoId) || "unknown-video";
  const title = cleanSingleLine(record?.title) || `YouTube Notes ${videoId}`;
  const url = cleanSingleLine(record?.url);
  const updatedAt = cleanSingleLine(record?.updatedAt);
  const exportedAt = cleanSingleLine(options.exportedAt) || new Date().toISOString();
  const notes = formatNotes(record?.notes);

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

export function markdownFilename(record, options = {}) {
  const titlePart = slugify(cleanSingleLine(record?.title) || "yt-notes");
  const exportedAt = cleanSingleLine(options.exportedAt) || new Date().toISOString();
  const datePart = formatFilenameDate(exportedAt);

  return `${datePart}-${titlePart}.md`;
}

function formatNotes(notes) {
  const normalized = typeof notes === "string" ? notes.replace(/\r\n/g, "\n").trim() : "";

  if (!normalized) {
    return "_No notes captured yet._";
  }

  return normalized
    .split("\n")
    .map((line) => formatLine(line))
    .join("\n");
}

function formatLine(line) {
  if (!line.trim()) {
    return "";
  }

  const timestampMatch = line.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);

  if (timestampMatch) {
    const [, timestamp, body] = timestampMatch;
    return body ? `- **${timestamp}** ${body}` : `- **${timestamp}**`;
  }

  return line;
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

import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const manifestPath = path.join(root, "manifest.json");
const backgroundPath = path.join(root, "src/background.js");
const contentScriptPath = path.join(root, "src/content/youtube.js");
const panelPath = path.join(root, "src/sidepanel/panel.html");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const backgroundSource = await readFile(backgroundPath, "utf8");
const contentScriptSource = await readFile(contentScriptPath, "utf8");
const panelSource = await readFile(panelPath, "utf8");

assertEqual(manifest.manifest_version, 3, "Manifest must use version 3.");
assertEqual(manifest.minimum_chrome_version, "116", "Manifest must target Chrome 116+ for sidePanel.open support.");
assertIncludes(manifest.permissions, "scripting", "Manifest must request scripting permission.");
assertIncludes(manifest.permissions, "sidePanel", "Manifest must request sidePanel permission.");
assertIncludes(manifest.permissions, "storage", "Manifest must request storage permission.");
assertIncludes(manifest.permissions, "tabs", "Manifest must request tabs permission.");
assertIncludes(manifest.permissions, "webNavigation", "Manifest must request webNavigation permission.");
assertIncludes(manifest.host_permissions, "https://www.youtube.com/*", "Manifest must allow YouTube watch pages.");
assertIncludes(manifest.host_permissions, "https://youtube.com/*", "Manifest must allow short YouTube hosts.");
assertEqual(manifest.icons?.["128"], "assets/icons/icon-128.png", "Manifest must declare a 128px extension icon.");
assertIncludesText(backgroundSource, "yt-notes:toggle-inline-panel", "Background script must preserve the inline drawer fallback.");
assertIncludesText(contentScriptSource, 'id="yt-notes-editor"', "Content script must preserve the inline drawer UI.");
assertIncludesText(contentScriptSource, 'id="yt-notes-export"', "Content script must preserve markdown export.");
assertIncludesText(contentScriptSource, "yt-notes:get-video-context", "Content script must expose YouTube page context.");
assertIncludesText(panelSource, 'id="export-markdown"', "Side panel must preserve markdown export.");
assertIncludesText(panelSource, 'id="note-editor"', "Side panel must preserve the note editor.");

await Promise.all(
  [
    "AGENTS.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    "docs/privacy-policy.md",
    "docs/specs/extension.md",
    "docs/web-store-listing.md",
    "docs/architecture.md",
    "docs/plans/initial-build.md",
    "docs/quality.md",
    "assets/icons/icon-16.png",
    "assets/icons/icon-32.png",
    "assets/icons/icon-48.png",
    "assets/icons/icon-128.png",
    "scripts/build-package.mjs",
    "scripts/generate_icons.py",
    "src/shared/editor.js",
    "src/shared/markdown.js",
    "src/shared/youtube.js",
    "src/sidepanel/panel.html",
    manifest.background.service_worker,
    ...manifest.content_scripts.flatMap((entry) => entry.js)
  ].map((relativePath) => ensureFile(relativePath))
);

console.log("Extension validation passed.");

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Received: ${actual}`);
  }
}

function assertIncludes(values, expected, message) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(message);
  }
}

function assertIncludesText(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

async function ensureFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  await access(absolutePath);
}

import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));

const version = manifest.version;
const outputFilename = `yt-notes-v${version}.zip`;
const outputPath = path.join(distDir, outputFilename);

await rm(outputPath, { force: true });
await mkdir(distDir, { recursive: true });

await execFileAsync(
  "zip",
  [
    "-r",
    outputPath,
    "manifest.json",
    "src",
    "assets"
  ],
  {
    cwd: root
  }
);

console.log(`Created ${outputPath}`);

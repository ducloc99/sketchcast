#!/usr/bin/env node
// One-time channel setup: the music beds (Suno V6 instrumental from brand/style.json "music", 12 credits, 2 versions)
// -> brand/music/bed-1.mp3, bed-2.mp3;
// bed-1 also becomes brand/music/nhac-kenh.mp3, the bed every video uses (copy bed-2 over it if you like that one more). Run again with "music" to make new ones.
// Usage (from the channel folder): node <sk>/scripts/setup-brand.mjs [music]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { channelBrand } from "./brand.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const BRAND = channelBrand();
if (!BRAND) { console.error("no brand/style.json here: run init-channel.mjs in the channel folder first"); process.exit(2); }
const force = process.argv.includes("music");
fs.mkdirSync(path.join(BRAND, "music"), { recursive: true });

if (force || !fs.existsSync(path.join(BRAND, "music/nhac-kenh.mp3"))) {
  const work = path.join(BRAND, ".music");
  fs.mkdirSync(work, { recursive: true });
  const S = JSON.parse(fs.readFileSync(path.join(BRAND, "style.json"), "utf8"));
  fs.writeFileSync(path.join(work, "script.json"), JSON.stringify({ title: S.music.title, music: S.music, scenes: [] }));
  console.log(execFileSync("node", [path.join(here, "music.mjs"), "240"], { cwd: work, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 26 }).toString().trim());
  for (const f of fs.readdirSync(path.join(work, "assets/music"))) fs.copyFileSync(path.join(work, "assets/music", f), path.join(BRAND, "music", f.replace(/\.\w+$/, ".mp3")));
  fs.rmSync(work, { recursive: true, force: true });
  fs.copyFileSync(path.join(BRAND, "music/bed-1.mp3"), path.join(BRAND, "music/nhac-kenh.mp3"));
}
console.log(`music: ${fs.readdirSync(path.join(BRAND, "music")).join(", ")}`);

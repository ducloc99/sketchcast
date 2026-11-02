#!/usr/bin/env node
// Instrumental music bed for one video with Suno (kie.ai, 12 credits, returns 2 versions).
// script.json "music": {"title": "...", "style": "genre, bpm, instruments, mood"} -> assets/music/bed-1.mp3, bed-2.mp3
// Usage (project dir): node <sk>/scripts/music.mjs [seconds=240]
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync("script.json", "utf8"));
const m = script.music;
if (!m?.style) { console.error('script.json needs "music": {"title", "style"}'); process.exit(2); }
fs.mkdirSync("assets/music", { recursive: true });
fs.mkdirSync(".work", { recursive: true });
const req = { model: "ai-music-api/generate", input: { custom_mode: true, instrumental: true, model: "V6", title: m.title || script.title,
  style: `${m.style}, instrumental background music for narration, steady, no vocals`, negative_tags: "vocals, singing, choir, spoken word, harsh, loud drops", duration: Number(process.argv[2] || 240) } };
fs.writeFileSync(".work/music.req.json", JSON.stringify(req));
const { stdout } = await run("node", [path.join(here, "kie.mjs"), ".work/music.req.json", "assets/music/bed"], { maxBuffer: 1 << 24 });
console.log(stdout.trim().split("\n").pop());

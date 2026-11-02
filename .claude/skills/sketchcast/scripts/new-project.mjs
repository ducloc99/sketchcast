#!/usr/bin/env node
// Scaffold a video project for the channel: HyperFrames init + folders + fonts + the channel look (brand/style.json),
// shared channel objects if any (brand/obj -> assets/obj, merged into index.json) and images (brand/img -> assets/img).
// Usage: node <sk>/scripts/new-project.mjs <projectDir>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BRAND } from "./brand.mjs"; // <channel>/brand, else the skill's template
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] || ".");
if (!fs.existsSync(path.join(BRAND, "style.json"))) { console.error(`no channel look at ${BRAND}/style.json (run init-channel.mjs in the channel folder)`); process.exit(2); }
if (fs.existsSync(dir) && fs.readdirSync(dir).filter((f) => !/^(research\.md|script\.json|notes\.md)$/.test(f)).length) { console.error(`not empty: ${dir}`); process.exit(2); }
fs.mkdirSync(dir, { recursive: true });
// hyperframes init wants an empty folder: park the planning files while it runs
const keep = fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f))]);
keep.forEach(([f]) => fs.rmSync(path.join(dir, f)));
fs.rmdirSync(dir);
execFileSync("npx", ["--yes", "hyperframes", "init", dir, "--non-interactive", "--example=blank", "--skill=general-video"], { stdio: "ignore", shell: true });
keep.forEach(([f, b]) => fs.writeFileSync(path.join(dir, f), b));
for (const d of ["assets/obj", "assets/img", "assets/fonts", "assets/vo", ".work", "renders"]) fs.mkdirSync(path.join(dir, d), { recursive: true });
fs.copyFileSync(path.join(here, "BeVietnamPro-SemiBold.ttf"), path.join(dir, "assets/fonts/BeVietnamPro-SemiBold.ttf"));
const S0 = JSON.parse(fs.readFileSync(path.join(BRAND, "style.json"), "utf8"));
fs.copyFileSync(path.join(here, "../assets", S0.font || "PatrickHand-Regular.ttf"), path.join(dir, "assets/fonts/hand.ttf"));
fs.copyFileSync(path.join(BRAND, "style.json"), path.join(dir, "style.json"));
let index = {};
const bobj = path.join(BRAND, "obj");
if (fs.existsSync(bobj)) {
  for (const f of fs.readdirSync(bobj)) if (f !== "index.json") fs.copyFileSync(path.join(bobj, f), path.join(dir, "assets/obj", f));
  if (fs.existsSync(path.join(bobj, "index.json"))) index = JSON.parse(fs.readFileSync(path.join(bobj, "index.json"), "utf8"));
}
fs.writeFileSync(path.join(dir, "assets/obj/index.json"), JSON.stringify(index, null, 1));
const bimg = path.join(BRAND, "img");
if (fs.existsSync(bimg)) for (const f of fs.readdirSync(bimg)) fs.copyFileSync(path.join(bimg, f), path.join(dir, "assets/img", f));
fs.rmSync(path.join(dir, "index.html"), { force: true });
for (const f of ["CLAUDE.md", "AGENTS.md"]) fs.rmSync(path.join(dir, f), { force: true }); // the channel's CLAUDE.md is the one that counts
console.log(`ready: ${dir} (brand objects: ${Object.keys(index).join(", ") || "none"})`);

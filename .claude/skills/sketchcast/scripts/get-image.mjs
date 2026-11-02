#!/usr/bin/env node
// Real pictures for a video (used by "image" items): official logos, headline screenshots, public photos.
//   node <sk>/scripts/get-image.mjs logo "OpenAI" [id]                 -> assets/img/<id>.png   (Wikimedia Commons, official file)
//   node <sk>/scripts/get-image.mjs shot <url> <id> [WxH] [--at "text"] -> assets/img/<id>.png   (a page as a clipping, 1100x700 css px)
//   node <sk>/scripts/get-image.mjs photo <url> <id>                   -> assets/img/<id>.png   (a public image, e.g. Wikimedia)
// Every picture is written to assets/img/SOURCES.md (what, where from) for the pinned comment and licence credits.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const [kind, a, b, c, ...rest] = process.argv.slice(2);
const UA = { "User-Agent": "sketchcast/1.0 (video research)" };
fs.mkdirSync("assets/img", { recursive: true });
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const note = (id, what, from) => fs.appendFileSync("assets/img/SOURCES.md", `- ${id}.png: ${what}. Nguồn: ${from}\n`);
async function save(url, id) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`download failed ${r.status}: ${url}`);
  await sharp(Buffer.from(await r.arrayBuffer())).png().toFile(`assets/img/${id}.png`);
}

if (kind === "logo") {
  const name = a, id = b || `logo-${slug(name)}`;
  let url = null, title = null;
  for (const t of [`File:${name} logo.svg`, `File:${name} logo.png`, `File:${name} icon.svg`, `File:${name} symbol.svg`, `File:${name}.svg`]) {
    const j = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(t)}&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`, { headers: UA })).json();
    const p = Object.values(j.query?.pages || {})[0];
    if (p?.imageinfo?.[0]?.thumburl) { url = p.imageinfo[0].thumburl; title = t; break; }
  }
  if (!url) {
    const j = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name + " logo")}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`, { headers: UA })).json();
    const words = name.toLowerCase().split(/\s+/);
    const hit = Object.values(j.query?.pages || {}).sort((x, y) => x.index - y.index).find((p) => /logo|symbol|icon/i.test(p.title) && words.every((w) => p.title.toLowerCase().includes(w)));
    if (hit) { url = hit.imageinfo[0].thumburl; title = hit.title; }
  }
  if (!url) { console.error(`no logo found for "${name}": find the official file on commons.wikimedia.org and use: get-image.mjs photo <url> ${id}`); process.exit(2); }
  await save(url, id);
  note(id, `logo ${name} (${title})`, url);
  console.log(`ok ${id}: ${title}`);
} else if (kind === "shot") {
  const url = a, id = b, size = c && /^\d+x\d+$/.test(c) ? c : "1100x700", extra = [c, ...rest].filter((x) => x && x !== size);
  const out = ".work/shots";
  execFileSync("node", [path.join(here, "web-shot.mjs"), out, size, `${id}=${url}`, ...extra], { stdio: "inherit" });
  fs.copyFileSync(path.join(out, `${id}.png`), `assets/img/${id}.png`);
  note(id, `ảnh chụp trang`, url);
  console.log(`ok ${id} (look at assets/img/${id}.png: the headline must be readable and nothing private on it)`);
} else if (kind === "photo") {
  await save(a, b);
  note(b, "ảnh công khai", a);
  console.log(`ok ${b}`);
} else {
  console.log('usage: get-image.mjs logo "<Name>" [id] | shot <url> <id> [WxH] [--at "text"] | photo <url> <id>');
  process.exit(1);
}

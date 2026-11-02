#!/usr/bin/env node
// Objects mode: generate every object of the video as a separate transparent PNG (GPT Image, background
// "transparent"), plus full-frame scene backgrounds for full-bleed styles. objects.json:
//   { "objects": {
//       "teo":    { "prompt": "Tèo character sheet: 4 poses — standing, sitting typing, running, cheering", "split": true },
//       "laptop": { "prompt": "an open laptop" },
//       "bg-s1":  { "prompt": "empty farm field at sunrise, no characters", "bg": true } } }
// "split": true = several objects drawn in one image (best way to keep a character identical across poses); the
//   image is cut into its separate parts -> assets/obj/teo-1.png, teo-2.png ... (left-to-right, top-to-bottom).
// Image-to-image cannot return transparency, so consistency comes from sheets, not references.
// Real people: { "keynes": { "person": "John Maynard Keynes", "prompt": "half-body portrait, ..." } } draws the person in the
//   channel style from their public Wikipedia photo (or "ref": "<public image url>"), on white, keyed out locally.
// Output: assets/obj/<id>.png (trimmed), assets/obj/index.json {id: {w, h}}, .work/objects.jpg (labelled contact sheet).
// Styles with reveal "draw" also get assets/obj/<id>.trace.json (strokes for the hand; see trace-objects.mjs).
// Usage (project dir): node <sk>/scripts/gen-objects.mjs [id ...]     (no ids = all missing)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { traceObject } from "./trace-objects.mjs";
const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const STYLE = JSON.parse(fs.readFileSync("style.json", "utf8"));
const spec = JSON.parse(fs.readFileSync("objects.json", "utf8"));
const only = process.argv.slice(2);
fs.mkdirSync("assets/obj", { recursive: true });
fs.mkdirSync(".work", { recursive: true });
const indexFile = "assets/obj/index.json";
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : {};
const done = (id) => fs.existsSync(`assets/obj/${id}.png`) || fs.existsSync(`assets/obj/${id}-1.png`) || fs.existsSync(`assets/obj/${id}.jpg`);
const keys = Object.keys(spec.objects).filter((k) => (only.length ? only.includes(k) : !done(k)));

const OBJ_RULES = "Draw ONLY the described object (no extra people, characters, hands or props unless they are described). Isolated on a fully transparent background: no ground, no floor shadow plane, no frame, no scenery behind it. No text, no letters, no watermark.";
const PERSON_NOTE = "Reference image 1 is a real photo of this person. Draw this real person as a friendly hand-drawn sketch character in the same pastel doodle style (simple wobbly ink lines, flat pastel fills, no grey shading, no realistic rendering), keeping their recognisable likeness: face shape, hairstyle, glasses, moustache or beard, typical clothing. Do not copy the photo's background.";
const REF_RULES = "Draw ONLY the described subject on a plain pure white background: no ground, no shadow plane, no frame, no scenery. No text, no letters, no watermark.";
async function photoOf(name) {
  for (const lang of ["en", "vi"]) {
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`, { headers: { "User-Agent": "sketchcast/1.0" } });
    if (!r.ok) continue;
    const j = await r.json(), o = j.originalimage;
    if (!o?.source) continue;
    // kie cannot fetch big Commons originals: use the standard 960 px thumbnail when the photo is wider than that
    const u = o.source.split("?")[0];
    const m = u.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/(?:commons|\w+))\/(\w)\/(\w\w)\/([^/]+)$/);
    return o.width > 960 && m ? `${m[1]}/thumb/${m[2]}/${m[3]}/${m[4]}/960px-${m[4]}` : u;
  }
  throw new Error(`no public photo found for "${name}": add "ref": "<public image url>" or leave the person out`);
}
const SHEET_RULES = "Draw each pose/object as a separate isolated figure with generous empty transparent space between them (they will be cut apart), all the same scale, all facing the camera similarly, on a fully transparent background. No text, no labels, no watermark.";
const BG_RULES = "Empty background plate for a video: no main characters, no text, no letters, no watermark; keep the lower-middle area calm (subjects will be placed there later). Aspect ratio 16:9.";

// connected parts of an alpha mask, on a downscaled grid; nearby parts (gap < ~2% of the image) are merged
async function splitParts(buf) {
  const meta = await sharp(buf).metadata();
  const S = 4, gw = Math.ceil(meta.width / S), gh = Math.ceil(meta.height / S);
  const { data } = await sharp(buf).extractChannel(3).resize(gw, gh, { kernel: "nearest" }).raw().toBuffer({ resolveWithObject: true });
  const R = Math.max(2, Math.round(Math.min(gw, gh) * 0.02)); // dilation radius in grid cells
  const on = new Uint8Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) on[i] = data[i] > 24 ? 1 : 0;
  const dil = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (on[y * gw + x])
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) dil[yy * gw + xx] = 1; }
  const lab = new Int32Array(gw * gh).fill(-1), boxes = [];
  for (let i = 0; i < gw * gh; i++) {
    if (!dil[i] || lab[i] >= 0) continue;
    const b = { x1: 1e9, y1: 1e9, x2: -1, y2: -1, n: 0 }, st = [i]; lab[i] = boxes.length;
    while (st.length) {
      const j = st.pop(), x = j % gw, y = (j / gw) | 0;
      if (on[j]) { b.n++; b.x1 = Math.min(b.x1, x); b.y1 = Math.min(b.y1, y); b.x2 = Math.max(b.x2, x); b.y2 = Math.max(b.y2, y); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, k = yy * gw + xx;
        if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && dil[k] && lab[k] < 0) { lab[k] = boxes.length; st.push(k); }
      }
    }
    boxes.push(b);
  }
  const big = Math.max(...boxes.map((b) => b.n));
  return boxes.filter((b) => b.n > big * 0.04 && b.x2 >= 0)
    .map((b) => ({ left: b.x1 * S, top: b.y1 * S, width: Math.min(meta.width - b.x1 * S, (b.x2 - b.x1 + 1) * S), height: Math.min(meta.height - b.y1 * S, (b.y2 - b.y1 + 1) * S) }))
    .sort((a, b) => (Math.abs(a.top - b.top) > Math.min(a.height, b.height) / 2 ? a.top - b.top : a.left - b.left));
}

// The model sometimes returns RGB with a painted grey/white checkerboard instead of real transparency:
// remove that background by flood-filling light, low-saturation pixels from the image border (no new credits spent).
async function keyOut(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bgLike = (i) => { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mn > 170 && mx - mn < 22; };
  const seen = new Uint8Array(w * h), st = [];
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) {
    const i = st.pop(); if (seen[i] || !bgLike(i)) continue; seen[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w);
  }
  let removed = 0;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = seen[i] ? 0 : 255; removed += seen[i]; }
  if (removed < w * h * 0.08) throw new Error("result has no alpha channel and no plain background to remove");
  const alpha = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extractChannel(3).blur(1.2).raw().toBuffer();
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = alpha[i];
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function save(id, buf) {
  // trimmed, and at most 1600 px on the long side (bigger only slows the page and the render)
  let out = await sharp(buf).trim({ threshold: 1 }).resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  if (STYLE.pixelate) {
    // snap the sprite to a crisp pixel grid
    const m = await sharp(out).metadata(), p = STYLE.pixelate * 2;
    const small = await sharp(out).resize(Math.max(1, Math.round(m.width / p)), Math.max(1, Math.round(m.height / p)), { kernel: "nearest" }).png().toBuffer();
    out = await sharp(small).resize(m.width, m.height, { kernel: "nearest" }).png().toBuffer();
  }
  fs.writeFileSync(`assets/obj/${id}.png`, out);
  const m = await sharp(out).metadata();
  index[id] = { w: m.width, h: m.height };
  if (STYLE.reveal === "draw") await traceObject(id, STYLE); // strokes for the hand (style.json ink.source)
}

async function one(k) {
  const o = spec.objects[k];
  const refs = o.person ? [await photoOf(o.person)] : [].concat(o.ref || []);
  const rules = refs.length ? REF_RULES : o.bg ? BG_RULES : o.split ? SHEET_RULES : OBJ_RULES;
  const prompt = [o.prompt, refs.length && o.person ? `The person is ${o.person}. ${PERSON_NOTE}` : "", STYLE.prompt, rules].filter(Boolean).join("\n\n");
  const req = refs.length
    ? { model: "gpt-image-2-5-flare-image-to-image", input: { prompt, input_urls: refs, aspect_ratio: o.aspect || "1:1", resolution: "2K" } }
    : { model: "gpt-image-2-5-flare-text-to-image", input: { prompt, aspect_ratio: o.bg ? "16:9" : o.aspect || (o.split ? "16:9" : "1:1"), resolution: "2K", background: o.bg ? "opaque" : "transparent" } };
  if (refs.length) fs.appendFileSync(".work/people.md", `- ${k}: ${o.person || "ref"} <- ${refs.join(", ")}\n`);
  fs.writeFileSync(`.work/obj-${k}.req.json`, JSON.stringify(req));
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { stdout } = await run("node", [path.join(here, "kie.mjs"), `.work/obj-${k}.req.json`, `.work/obj-${k}`], { maxBuffer: 1 << 24 });
      const file = JSON.parse(stdout.trim().split("\n").pop()).files[0];
      if (o.bg) {
        let buf = await sharp(file).resize(1920, 1080, { fit: "cover" }).toBuffer();
        if (STYLE.pixelate) {
          buf = await sharp(buf).resize(1920 / STYLE.pixelate, 1080 / STYLE.pixelate, { kernel: "nearest" }).toBuffer();
          buf = await sharp(buf).resize(1920, 1080, { kernel: "nearest" }).toBuffer();
        }
        await sharp(buf).jpeg({ quality: 90 }).toFile(`assets/obj/${k}.jpg`);
        index[k] = { w: 1920, h: 1080, bg: true };
      } else {
        const meta = await sharp(file).metadata();
        let buf = fs.readFileSync(file);
        if (!meta.hasAlpha) { buf = await keyOut(file); console.error(`${k}: no alpha in result, background keyed out locally`); }
        if (o.split) {
          const parts = await splitParts(buf);
          for (const [i, r] of parts.entries()) await save(`${k}-${i + 1}`, await sharp(buf).extract(r).png().toBuffer());
          console.log(`ok ${k}: ${parts.length} parts`);
        } else await save(k, buf);
      }
      fs.writeFileSync(indexFile, JSON.stringify(index, null, 1));
      if (!o.split) console.log(`ok ${k}`);
      return;
    } catch (e) { console.error(`fail ${k} (${attempt}): ${String(e.stderr || e.message).slice(-300)}`); }
  }
}

const q = keys.slice();
await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) await one(q.shift()); }));
fs.writeFileSync(indexFile, JSON.stringify(index, null, 1));

// labelled contact sheet of all objects on a grey checker, to check them and learn their ids
const ids = Object.keys(index).sort();
const TW = 360, TH = 300, cols = 5, rows = Math.ceil(ids.length / cols);
const comps = [];
for (const [i, id] of ids.entries()) {
  const src = index[id].bg ? `assets/obj/${id}.jpg` : `assets/obj/${id}.png`;
  const img = await sharp(src).resize(TW - 20, TH - 60, { fit: "inside" }).flatten({ background: STYLE.sheetBg || "#c9ccd1" }).toBuffer();
  const x = (i % cols) * TW, y = Math.floor(i / cols) * TH;
  comps.push({ input: img, left: x + 10, top: y + 10 });
  comps.push({ input: Buffer.from(`<svg width="${TW}" height="40" xmlns="http://www.w3.org/2000/svg"><text x="10" y="28" font-family="Arial" font-size="22" font-weight="700" fill="#fff">${id} (${index[id].w}x${index[id].h})</text></svg>`), left: x, top: y + TH - 44 });
}
if (ids.length) await sharp({ create: { width: cols * TW, height: rows * TH, channels: 3, background: "#3a3d44" } }).composite(comps).jpeg({ quality: 82 }).toFile(".work/objects.jpg");
console.log(`${ids.length} objects -> .work/objects.jpg`);

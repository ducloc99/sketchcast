#!/usr/bin/env node
// Make the hand-drawing strokes (assets/obj/<id>.trace.json) for transparent objects, whatever their art style.
// style.json "ink.source" picks what the hand draws:
//   "lines"   dark ink lines of the art (hand-drawn styles, anime line art)              [default]
//   "outline" the silhouette contour only (pixel sprites)
//   "edges"   the silhouette contour + the strongest inner edges (3D renders, paintings without ink lines)
// gen-objects.mjs calls this for every new object when the style reveals with "draw"; run it by hand to (re)trace
// existing objects, e.g. after changing ink settings:  node <sk>/scripts/trace-objects.mjs [id ...]  (no ids = all)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

export async function traceObject(id, STYLE) {
  const src = `assets/obj/${id}.png`, flat = `.work/${id}.ink.png`;
  const source = STYLE.ink?.source || "lines";
  fs.mkdirSync(".work", { recursive: true });
  const { width: w, height: h } = await sharp(src).metadata();
  let thr = STYLE.ink?.threshold ?? 95;
  if (source === "lines") {
    await sharp(src).flatten({ background: "#ffffff" }).png().toFile(flat);
  } else {
    // ink image (0 = ink, 255 = paper) built pixel by pixel
    const alpha = await sharp(src).ensureAlpha().extractChannel(3).raw().toBuffer();
    const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x] > 40;
    const out = Buffer.alloc(w * h, 255);
    const R = Math.max(2, Math.round(Math.min(w, h) / 260)); // contour line thickness
    // contour: an inside pixel with an outside pixel within R
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x - R, y) || !inside(x + R, y) || !inside(x, y - R) || !inside(x, y + R)) out[y * w + x] = 0;
    }
    if (source === "edges") {
      // strongest inner edges: Sobel gradient of the luminance, inside the silhouette only
      const grey = await sharp(src).flatten({ background: "#808080" }).greyscale().blur(1.4).raw().toBuffer();
      const T = (STYLE.ink?.edge ?? 40) * 4;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (alpha[i] < 230) continue;
        const gx = grey[i + 1 - w] + 2 * grey[i + 1] + grey[i + 1 + w] - grey[i - 1 - w] - 2 * grey[i - 1] - grey[i - 1 + w];
        const gy = grey[i - 1 + w] + 2 * grey[i + w] + grey[i + 1 + w] - grey[i - 1 - w] - 2 * grey[i - w] - grey[i + 1 - w];
        if (Math.hypot(gx, gy) > T) out[i] = 0;
      }
    }
    await sharp(out, { raw: { width: w, height: h, channels: 1 } }).png().toFile(flat);
    thr = 128;
  }
  await run("node", [path.join(here, "trace.mjs"), flat, `assets/obj/${id}.trace.json`, String(thr)]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const STYLE = JSON.parse(fs.readFileSync("style.json", "utf8"));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.entries(JSON.parse(fs.readFileSync("assets/obj/index.json", "utf8"))).map(([k]) => k).filter((k) => fs.existsSync(`assets/obj/${k}.png`));
  for (const id of ids) { await traceObject(id, STYLE); const t = JSON.parse(fs.readFileSync(`assets/obj/${id}.trace.json`, "utf8")); console.log(`ok ${id}: ${t.paths.length} strokes`); }
}

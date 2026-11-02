// Trace the ink lines of a sketch illustration into ordered SVG strokes.
// Usage: node trace.mjs <in.png> <out.json> [threshold=110]
// Output: { w, h, paths: [{ d, len, pts: [[x,y],...] }] } in source-pixel units,
// ordered roughly the way a person would draw (greedy nearest-next from top-left).
import fs from "node:fs";
import sharp from "sharp";
import potrace from "potrace";
import { svgPathProperties } from "svg-path-properties";

const [inFile, outFile, thr = "110"] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error("usage: node trace.mjs <in.png> <out.json> [threshold]");
  process.exit(2);
}

// Flatten transparency onto white, keep only dark ink as black.
const img = sharp(inFile).flatten({ background: "#ffffff" });
const { width: w, height: h } = await img.metadata();
const mask = await img.clone().greyscale().threshold(Number(thr)).png().toBuffer();

const svg = await new Promise((res, rej) =>
  potrace.trace(mask, { turdSize: 12, optTolerance: 0.4, threshold: 128, blackOnWhite: true }, (e, s) =>
    e ? rej(e) : res(s),
  ),
);
const d = svg.match(/ d="([^"]+)"/)?.[1] ?? "";
// Split the compound path into subpaths (each starts with M).
const subs = d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);

let paths = [];
for (const sd of subs) {
  let props;
  try {
    props = new svgPathProperties(sd);
  } catch {
    continue;
  }
  const len = props.getTotalLength();
  if (!(len > 10)) continue;
  const n = Math.max(2, Math.min(24, Math.round(len / 60)));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const p = props.getPointAtLength((len * i) / n);
    pts.push([Math.round(p.x), Math.round(p.y)]);
  }
  paths.push({ d: sd, len: Math.round(len), pts });
}

// Greedy ordering: start top-left, always go to the nearest unvisited path start.
const ordered = [];
let cur = [0, 0];
const left = paths.slice();
while (left.length) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < left.length; i++) {
    const [x, y] = left[i].pts[0];
    // Bias toward top-to-bottom progress so the drawing builds downward.
    const dd = Math.hypot(x - cur[0], (y - cur[1]) * 1.6) - left[i].len * 0.05;
    if (dd < bd) { bd = dd; bi = i; }
  }
  const p = left.splice(bi, 1)[0];
  ordered.push(p);
  cur = p.pts[p.pts.length - 1];
}
paths = ordered;

fs.writeFileSync(outFile, JSON.stringify({ w, h, paths }));
const total = paths.reduce((a, p) => a + p.len, 0);
console.log(`${inFile}: ${w}x${h}, ${paths.length} strokes, total length ${total}`);

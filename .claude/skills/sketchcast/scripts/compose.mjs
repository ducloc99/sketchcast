// Build the video (objects mode): every scene = a paper page + separate objects / handwritten text / arrows placed by
// scenes.json, each appearing at the sentence that names it. Channel version of inkreel's compose.mjs, with:
//   papers      scenes.json "paper": "plain" | "old" | "grid" (style.json "papers") -> paper colour + texture, ink colour, object tint
//   stage strip script.json "stages": [{"key","label"}...] (copied from the series file), shown at the top-left with the
//               current stage circled; scenes.json "stage": "<key>". No "stages" = no strip.
//   year roll   script.json scenes[].year (+ optional "yearLabel"): when the year changes, a big handwritten year rolls from the
//               old to the new one while the page turns (e.g. 2026 -> 2005 = "tua lại"); the voice waits for it
//   hook cover  script.json "hook": {"text": "Ai bắt bạn\nlàm 8 tiếng?", "until": [sentence, seconds], "obj": "clock"}:
//               a full cover page visible from frame 0 (the muted autoplay frame), turned away when "until" is reached
//   count       item {"count": [0, 93], "suffix": "%", "x", "y", "size", "at", "dur"}: a number that counts up
//   line/shape  items {"line": [x1,y1,x2,y2] | [[x,y],...]} and {"shape": "rect"|"ellipse"|"person"|"path", "box"|"c"|"d", "fill"}:
//               drawn by the hand like text, then kept (with their fill)
//   image       item {"image": "assets/img/x.png", "x", "y", "h"|"w", "frame": "none"|"clip", "tilt"}: a real picture (official
//               logo, a headline screenshot as a taped paper clipping); fades in, a clipping drops in and settles
//   quote       item {"quote": "...", "who": "J. M. Keynes", "when": "1930", "x", "y", "w", "size"}: accent bar, big quote mark,
//               the words written by hand, then who said it and when
//   timeline    item {"timeline": [{"year": 1914, "text": "...", "at": [2, 0]}, ...], "x1", "x2", "y"}: an arrow with dated ticks
//   chart       item {"chart": "bar"|"line"|"dots", "data": [{"label", "value", "at"}], "box": [x1,y1,x2,y2], "unit": "%"}:
//               hand-drawn charts with exact numbers; "dots" = {"total": 10, "value": 3} little people, the first "value" in the accent
//   composite items (quote, timeline, chart) are expanded into text / line / shape items before drawing (see expandItems)
//   highlight   mark {"highlight": [x1, y, x2]}: a translucent marker stroke over a word (besides circle / underline)
//   sfx         every hand drawing, page turn, year roll and mark writes a cue to .work/sfx.json; master.mjs mixes them
//   vertical    --vertical s1,s2,s3 -> teaser/ (its own small project, 1080x1920 Reel): the chosen scenes on a card, a big
//               title band above, big captions below, a call to action at the end. Render: npx hyperframes render teaser -o renders/teaser.mp4
// How an item appears: style.json "reveal" or the item's "anim": draw (hand + marker, then colour) | pop | fade | blocks.
// scenes.json: { "s1": { "stage": "belief", "paper": "old", "bg": "#ffffff" (optional override),
//   "items": [ { "obj": "laptop", "x": 520, "y": 600, "h": 460, "at": [0, 0.2] },        x,y = centre on the 1920x1080 page
//              { "text": "Báo cáo", "x": 1300, "y": 220, "size": 76, "at": [1, 0] },
//              { "count": [0, 8], "suffix": " tiếng", "x": 960, "y": 500, "size": 150, "at": [2, 0] },
//              { "arrow": [900, 600, 1150, 420], "at": [2, 0] } ],
//   "cam": [ { "box": "full" }, { "box": [x1,y1,x2,y2], "at": [1, 0.3], "dur": 2 } ],
//   "marks": [ { "circle": [cx,cy,rx,ry], "at": [1, 0.5] }, { "underline": [x1,y,x2], "at": [..] }, { "highlight": [x1,y,x2], "at": [..] } ] } }
// Usage (project dir): node <sk>/scripts/compose.mjs                      -> index.html + .work/sfx.json
//                      node <sk>/scripts/compose.mjs --preview            -> .work/layout/<scene>.jpg (final layout, fast)
//                      node <sk>/scripts/compose.mjs --vertical s1,s2,s3  -> teaser/index.html (+ the assets it uses) + .work/sfx-teaser.json
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import opentype from "opentype.js";
import { svgPathProperties } from "svg-path-properties";
import { fileURLToPath } from "node:url";
import { channelBrand, SKILL_BRAND } from "./brand.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, "..", "assets");

const W = 1920, H = 1080; // page size (all scenes.json coordinates)
const TRANS = 0.85, VO_IN = 0.7, END_HOLD = 3.0, ROLL_LEAD = 1.4;
const argv = process.argv.slice(2);
const PREVIEW = argv.includes("--preview");
const VERT = argv.includes("--vertical") ? (argv[argv.indexOf("--vertical") + 1] || "").split(",").filter(Boolean) : null;
const S = JSON.parse(fs.readFileSync("style.json", "utf8"));
const ACC = S.accent || "#e4572e";
const CAP = { color: "#26262b", active: ACC, glow: "#ffffff", outline: null, ...(S.caption || {}) };
const INK = { color: "#26262b", width: 2.6, minLen: 25, ...(S.ink || {}) };
const MARK = S.mark === undefined ? ACC : S.mark;
const SPEED = S.drawSpeed || 2400; // ink px per second while drawing
const BRAND = S.brand && S.brand.showName !== false ? S.brand : null; // the user: no channel name on screen
const scenesL = JSON.parse(fs.readFileSync("scenes.json", "utf8"));
const index = JSON.parse(fs.readFileSync("assets/obj/index.json", "utf8"));
const font = opentype.loadSync(path.join(ASSETS, S.font || "PatrickHand-Regular.ttf"));
// style.json "textScale" shrinks every drawn text (wide fonts) so layouts written in "size" units keep fitting
const TS = S.textScale ?? 1;
const textW = (t, size) => font.getAdvanceWidth(t, size * TS);
const HAND = JSON.parse(fs.readFileSync(path.join(ASSETS, "hand-marker.json"), "utf8"));
const HW = S.handWidth || 720; // big enough that the arm always runs off the frame edge
const HS = HW / HAND.w;
// what draws the ink: style.json "pen": {"type": "spark"} (a glowing point of light, the channel's own) or {"type": "hand"} (hand + marker)
const PEN = { type: "hand", size: 34, ...(S.pen || {}) }, PENC = PEN.color || ACC;

const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toks = (line) => line.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
const isBgColor = (b) => !b || /^#|^rgb/.test(b);

// paper look: style.json "papers".<name> over the plain page ("era" past/now/future = old/plain/grid, older projects)
const PLAIN = { pageBg: S.pageBg || "#ffffff", pattern: "none", ink: INK.color, text: S.textColor || INK.color, objFilter: "none", vignette: false };
const PAPERS = S.papers || {};
const OLD_ERA = { past: "old", now: "plain", future: "grid" };
const paperOf = (L) => L?.paper || OLD_ERA[L?.era] || null;
const eraOf = (L) => ({ ...PLAIN, ...(paperOf(L) ? PAPERS[paperOf(L)] || {} : {}), ...(L?.bg && isBgColor(L.bg) ? { pageBg: L.bg } : {}) });
const SCRIPT0 = fs.existsSync("script.json") ? JSON.parse(fs.readFileSync("script.json", "utf8")) : {};
const STAGES = (SCRIPT0.stages || S.series?.[SCRIPT0.series]?.stages || []).map((st) => (typeof st === "string" ? { key: st, label: st } : st));
const stageOf = (L) => (STAGES.some((st) => st.key === L?.stage) ? L.stage : null);
const STRIP_SIZE = 44, STRIP_GAP = 46;
const stripW = () => 44 + STAGES.reduce((a, st) => a + textW(st.label, STRIP_SIZE) + STRIP_GAP, 0);
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0 0.15 0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// item geometry on the 1920x1080 page
function geo(it) {
  const o = index[it.obj];
  if (!o) throw new Error(`unknown object "${it.obj}" (see assets/obj/index.json)`);
  const h = it.h ?? (it.w ? (it.w * o.h) / o.w : o.h * 0.5), w = (h * o.w) / o.h;
  return { w, h, x: it.x - w / 2, y: it.y - h / 2, k: h / o.h, o };
}
// handwritten text as glyph outlines (correct Vietnamese, never AI-drawn); "\n" = new line
function glyphs(text, x, y, size, align = "center") {
  const lines = String(text).split("\n"), lh = size * (TS < 1 ? TS * 1.3 : 1.12), out = [];
  lines.forEach((ln, i) => {
    const wLine = textW(ln, size), x0 = align === "left" ? x : x - wLine / 2;
    const base = y + size * TS * 0.36 + (i - (lines.length - 1) / 2) * lh;
    out.push(...font.getPaths(ln, x0, base, size * TS).map((p) => p.toPathData(1)).filter((d) => d.length > 2));
  });
  return out;
}
const textLayout = (it, E) => ({ size: it.size || 64, glyphs: glyphs(it.text, it.x, it.y, it.size || 64, it.align), color: it.color || E.text });
const countText = (it, v) => `${it.prefix || ""}${Math.round(v).toLocaleString("vi-VN")}${it.suffix || ""}`;
function arrowPath(a, bendK = 0.12) {
  const [x1, y1, x2, y2] = a, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  const bend = bendK * L, cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend;
  const ang = Math.atan2(y2 - cy, x2 - cx), hl = Math.min(34, L * 0.25);
  const h1 = [x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45)], h2 = [x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45)];
  return [`M${r1(x1)} ${r1(y1)} Q${r1(cx)} ${r1(cy)} ${r1(x2)} ${r1(y2)}`, `M${r1(h1[0])} ${r1(h1[1])} L${r1(x2)} ${r1(y2)} L${r1(h2[0])} ${r1(h2[1])}`];
}
// wobbly hand-drawn ellipse / line as a polyline
function wobble(kind, g, rnd) {
  const pts = [];
  if (kind === "circle") {
    const [cx, cy, rx, ry] = g, a0 = -2.4 + rnd() * 0.3;
    for (let k = 0; k <= 50; k++) { const a = a0 + (k / 50) * Math.PI * 2 * 1.1, f = 1 + 0.04 * Math.sin(k * 0.7) + (k / 50) * 0.07; pts.push([cx + rx * f * Math.cos(a), cy + ry * f * Math.sin(a)]); }
  } else {
    const [x1, y, x2] = g;
    for (let k = 0; k <= 12; k++) pts.push([x1 + ((x2 - x1) * k) / 12, y + Math.sin(k * 0.9) * 3 + (k / 12) * (kind === "highlight" ? 3 : 6)]);
  }
  const len = Math.ceil(pts.slice(1).reduce((a, q, k) => a + Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1]), 0)) + 4;
  return { d: `M${pts.map((q) => `${r1(q[0])} ${r1(q[1])}`).join(" L")}`, len };
}

// ---------- building blocks: wrapped text, wobbly shapes, little people ----------
function wrapText(text, maxW, size) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let cur = "";
    for (const w of para.split(/\s+/)) { const t = cur ? cur + " " + w : w; if (cur && textW(t, size) > maxW) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out.join("\n");
}
const nLines = (t) => String(t).split("\n").length;
const mkRnd = (seed) => { let v = seed; return () => (v = (v * 16807) % 2147483647) / 2147483647; };
function wobblyRect([x1, y1, x2, y2], rnd, j = 3) {
  const c = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], pts = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4], n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 60));
    for (let k = 0; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n + (rnd() - 0.5) * j, a[1] + ((b[1] - a[1]) * k) / n + (rnd() - 0.5) * j]);
  }
  return `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(" L")} Z`;
}
const ellipsePath = ([cx, cy, rx, ry]) => `M${r1(cx - rx)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)} Z`;
function personPath(cx, top, s) {
  const r = s * 0.17;
  return `${ellipsePath([cx, top + r, r, r])} M${r1(cx - s * 0.3)} ${r1(top + s)} L${r1(cx - s * 0.3)} ${r1(top + s * 0.64)} Q${r1(cx - s * 0.3)} ${r1(top + s * 0.42)} ${r1(cx)} ${r1(top + s * 0.42)} Q${r1(cx + s * 0.3)} ${r1(top + s * 0.42)} ${r1(cx + s * 0.3)} ${r1(top + s * 0.64)} L${r1(cx + s * 0.3)} ${r1(top + s)} Z`;
}
const linePath = (ln) => { const pts = typeof ln[0] === "number" ? [[ln[0], ln[1]], [ln[2], ln[3]]] : ln; return `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(" L")}`; };
function shapePath(it, rnd) {
  if (it.shape === "rect") return wobblyRect(it.box, rnd, it.jitter ?? 3);
  if (it.shape === "ellipse") return ellipsePath(it.c);
  if (it.shape === "person") return personPath(it.x, it.y, it.h || 90);
  return it.d;
}
const PALETTE = S.chartColors || ["#f6c4c4", "#c4dcf6", "#cdebc9", "#fbdcb0", "#fbefa8", "#e2d3f3"];
const fmtNum = (v) => Number(v).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

// composite items -> primitives the hand can draw (text, line, arrow, shape)
function expandItems(items, E) {
  const out = [];
  for (const it of items) {
    if (it.quote) {
      const w = it.w || 1100, size = it.size || 66, x0 = it.x - w / 2, body = wrapText(it.quote, w - size, size), h = nLines(body) * size * 1.12, top = it.y - h / 2;
      out.push({ line: [x0 - 30, top - 14, x0 - 30, top + h + 14], color: ACC, width: 7, at: it.at, maxDur: 0.5 });
      out.push({ text: "\u201c", x: x0 - 6, y: top + size * 0.15, size: size * 2.2, align: "left", color: ACC, at: it.at, maxDur: 0.5 });
      out.push({ text: body, x: x0 + size * 0.95, y: it.y, size, align: "left", at: it.at, maxDur: it.maxDur || 3.8 });
      if (it.who) out.push({ text: [it.who, it.when].filter(Boolean).join(" · "), x: x0 + size * 0.95, y: top + h + size * 0.85, size: size * 0.62, align: "left", color: it.whoColor || ACC, at: it.whoAt || it.at, maxDur: 1.2 });
    } else if (it.timeline) {
      const ev = it.timeline, x1 = it.x1 ?? 220, x2 = it.x2 ?? 1700, y = it.y ?? 500, seg = (x2 - x1) / ev.length, ys = it.size || 64, ls = ys * 0.74;
      out.push({ arrow: [x1 - 40, y, x2 + 50, y], bend: 0.02, width: 5, at: it.at });
      ev.forEach((e, i) => {
        const px = x1 + seg * (i + 0.5), a = e.at || it.at, up = it.alternate ? i % 2 === 0 : true, lab = wrapText(e.text, seg * 0.9, ls), lh = nLines(lab) * ls * 1.12;
        out.push({ line: [px, y - 20, px, y + 20], width: 5, at: a, maxDur: 0.2 });
        out.push({ text: String(e.year), x: px, y: up ? y - 66 : y + 66, size: ys, color: e.color || ACC, at: a, maxDur: 0.5 });
        out.push({ text: lab, x: px, y: up ? y + 50 + lh / 2 : y - 50 - lh / 2, size: ls, at: a, maxDur: 1.1 });
      });
    } else if (it.chart) out.push(...expandChart(it, E));
    else out.push(it);
  }
  return out;
}
function expandChart(it, E) {
  const out = [], [x1, y1, x2, y2] = it.box || [320, 240, 1600, 800], unit = it.unit || "", data = it.data || [];
  const ls = it.labelSize || 44, vs = it.valueSize || 58;
  if (it.title) out.push({ text: it.title, x: (x1 + x2) / 2, y: y1 - vs * 1.05 - (it.titleSize || 64) * 0.8, size: it.titleSize || 64, at: it.at, maxDur: 1.2 });
  if (it.chart === "bar") {
    const vals = data.map((d) => d.value), lo = Math.min(0, it.min ?? 0, ...vals), hi = Math.max(0, it.max ?? 0, ...vals), neg = lo < 0;
    const Y = (v) => y2 - ((v - lo) / (hi - lo || 1)) * (y2 - y1), y0 = Y(0), seg = (x2 - x1) / data.length, bw = Math.min(seg * 0.56, 260);
    out.push({ line: [x1 - 24, y0, x2 + 24, y0], width: 5, at: it.at, maxDur: 0.6 });
    data.forEach((d, i) => {
      const cx = x1 + seg * (i + 0.5), yv = Y(d.value), a = d.at || it.at, top = Math.min(yv, y0), bot = Math.max(yv, y0, top + 6);
      const lab = wrapText(d.label, seg * 0.92, ls), labY = Math.max(y0, y2) + (neg ? vs * 1.4 : 0) + 26 + (nLines(lab) * ls * 1.12) / 2;
      out.push({ shape: "rect", box: [cx - bw / 2, top, cx + bw / 2, bot], fill: d.color || PALETTE[i % PALETTE.length], at: a, maxDur: 0.7 });
      out.push({ text: `${it.signed && d.value > 0 ? "+" : ""}${fmtNum(d.value)}${unit}`, x: cx, y: d.value >= 0 ? top - vs * 0.7 : bot + vs * 0.7, size: vs, color: d.valueColor || ACC, at: a, maxDur: 0.5 });
      out.push({ text: lab, x: cx, y: labY, size: ls, at: a, maxDur: 0.6 });
    });
  } else if (it.chart === "line") {
    const vals = data.map((d) => d.value), lo = it.min ?? Math.min(...vals), hi = it.max ?? Math.max(...vals);
    const X = (i) => x1 + (data.length < 2 ? 0.5 : i / (data.length - 1)) * (x2 - x1), Y = (v) => y2 - ((v - lo) / (hi - lo || 1)) * (y2 - y1);
    const pts = data.map((d, i) => [X(i), Y(d.value)]), la = it.lineAt || it.at;
    out.push({ line: [x1 - 40, y2 + 40, x2 + 40, y2 + 40], width: 4, at: it.at, maxDur: 0.6 });
    out.push({ line: pts, width: 7, color: it.color || ACC, at: la, maxDur: it.lineDur || 2.2 });
    data.forEach((d, i) => {
      const a = d.at || la;
      out.push({ shape: "ellipse", c: [pts[i][0], pts[i][1], 13, 13], fill: it.color || ACC, stroke: it.color || ACC, at: a, maxDur: 0.15 });
      out.push({ text: `${fmtNum(d.value)}${unit}`, x: pts[i][0], y: pts[i][1] - vs * 0.85, size: vs * 0.85, color: ACC, at: a, maxDur: 0.4 });
      out.push({ text: String(d.label), x: pts[i][0], y: y2 + 40 + ls * 1.05, size: ls, at: a, maxDur: 0.35 });
    });
  } else if (it.chart === "dots") {
    const total = it.total || 10, val = it.value ?? 0, cols = it.cols || Math.min(total, 10), rows = Math.ceil(total / cols);
    const cw = (x2 - x1) / cols, ch = (y2 - y1) / rows, sz = Math.min(cw * 0.9, ch * 0.88);
    for (let i = 0; i < total; i++) {
      const c = i % cols, r = Math.floor(i / cols), hi = i < val;
      out.push({ shape: "person", x: x1 + cw * (c + 0.5), y: y1 + ch * r + (ch - sz) / 2, h: sz, fill: hi ? it.color || ACC : it.restColor || "#dcd8d0", stroke: E.ink, width: 3.5, at: hi && it.hiAt ? it.hiAt : it.at, maxDur: total > 20 ? 0.12 : 0.32 });
    }
    if (it.caption) out.push({ text: it.caption, x: (x1 + x2) / 2, y: y2 + 70, size: it.captionSize || 64, color: ACC, at: it.hiAt || it.at, maxDur: 1.2 });
  }
  return out;
}
// real pictures: natural size (filled in before drawing)
const IMGS = {};
async function loadImgs(list) { for (const it of list) if (it.image && !IMGS[it.image]) { const m = await sharp(it.image).metadata(); IMGS[it.image] = { w: m.width, h: m.height }; } }
function imgGeo(it) {
  const m = IMGS[it.image], pad = it.frame === "clip" ? 28 : 0;
  const h = it.h ?? (it.w ? (it.w * m.h) / m.w : Math.min(m.h, 520)), w = (h * m.w) / m.h;
  return { w: w + pad, h: h + pad, x: it.x - (w + pad) / 2, y: it.y - (h + pad) / 2 };
}

// ---------- preview: final layout of every scene, composed with sharp ----------
if (PREVIEW) {
  fs.mkdirSync(".work/layout", { recursive: true });
  for (const [id, L] of Object.entries(scenesL)) {
    const E = eraOf(L);
    const base = isBgColor(L.bg) ? sharp({ create: { width: W, height: H, channels: 3, background: E.pageBg } }) : sharp(`assets/obj/${L.bg}.jpg`).resize(W, H);
    const comps = [], svg = [], items = expandItems(L.items, E), prnd = mkRnd(7);
    await loadImgs(items);
    for (const it of items) {
      if (it.image) {
        const g = imgGeo(it);
        comps.push({ input: await sharp(it.image).resize(Math.round(g.w), Math.round(g.h), { fit: "contain", background: it.frame === "clip" ? "#ffffff" : { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: Math.max(0, Math.round(g.x)), top: Math.max(0, Math.round(g.y)) });
      } else if (it.line || it.shape) {
        svg.push(`<path d="${it.line ? linePath(it.line) : shapePath(it, prnd)}" fill="${it.fill || "none"}" stroke="${it.stroke || it.color || E.ink}" stroke-width="${it.width || 4}" stroke-linejoin="round" stroke-linecap="round"/>`);
      } else if (it.obj) {
        const g = geo(it);
        let img = sharp(`assets/obj/${it.obj}.png`).resize(Math.max(1, Math.round(g.w)), Math.max(1, Math.round(g.h)));
        if (it.flip) img = img.flop();
        const left = Math.round(g.x), top = Math.round(g.y);
        // sharp cannot composite outside the canvas: crop the part that falls inside
        let buf = await img.png().toBuffer();
        const cl = Math.max(0, -left), ct = Math.max(0, -top), cw = Math.min(Math.round(g.w) - cl, W - Math.max(0, left)), ch = Math.min(Math.round(g.h) - ct, H - Math.max(0, top));
        if (cw > 0 && ch > 0) { buf = await sharp(buf).extract({ left: cl, top: ct, width: cw, height: ch }).toBuffer(); comps.push({ input: buf, left: Math.max(0, left), top: Math.max(0, top) }); }
      } else if (it.text || it.count) {
        const t = it.text ? textLayout(it, E) : { glyphs: glyphs(countText(it, it.count[1]), it.x, it.y, it.size || 120), color: it.color || E.text };
        svg.push(`<path d="${t.glyphs.join(" ")}" fill="${t.color}"/>`);
      } else if (it.arrow) {
        svg.push(...arrowPath(it.arrow, it.bend).map((d) => `<path d="${d}" fill="none" stroke="${it.color || E.ink}" stroke-width="${it.width || 5}" stroke-linecap="round" stroke-linejoin="round"/>`));
      }
    }
    // reserved areas: captions (red), era strip + brand corner (blue), vertical-teaser safe lines (green)
    const zones = [`<rect x="0" y="${H * 0.86}" width="${W}" height="${H * 0.14}" fill="#ff0000" fill-opacity="0.08"/>`];
    if (stageOf(L)) zones.push(`<rect x="0" y="0" width="${Math.round(stripW())}" height="92" fill="#2f6fd6" fill-opacity="0.08"/>`);
    if (BRAND) zones.push(`<rect x="${W - 330}" y="0" width="330" height="92" fill="#2f6fd6" fill-opacity="0.08"/>`);
    zones.push(`<line x1="240" y1="0" x2="240" y2="${H}" stroke="#2a9d4b" stroke-opacity="0.35" stroke-dasharray="12 10" stroke-width="3"/><line x1="${W - 240}" y1="0" x2="${W - 240}" y2="${H}" stroke="#2a9d4b" stroke-opacity="0.35" stroke-dasharray="12 10" stroke-width="3"/>`);
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg.join("")}${zones.join("")}</svg>`), left: 0, top: 0 });
    await base.composite(comps).jpeg({ quality: 85 }).toFile(`.work/layout/${id}.jpg`);
  }
  console.log(`.work/layout/*.jpg (red = captions, blue = stage strip / brand corner, green dashes = Reel-safe width)`);
  process.exit(0);
}

const script = JSON.parse(fs.readFileSync("script.json", "utf8"));
const words = JSON.parse(fs.readFileSync("assets/vo/words.json", "utf8"));
if (S.reveal === "draw" && PEN.type === "hand") fs.copyFileSync(path.join(ASSETS, HAND.src), "assets/hand.png");
const sfx = [];
// sounds come from the channel set brand/sfx/ first, then the set that ships with the skill, then its assets
const SFX_DIRS = [channelBrand() && path.join(channelBrand(), "sfx"), path.join(SKILL_BRAND, "sfx"), ASSETS].filter(Boolean);
const sfxFile = (f) => SFX_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)) || path.join(ASSETS, f);
const cue = (t, key, gain = 0, dur) => sfx.push({ t: r3(t), src: sfxFile((S.sfx || {})[key] || `${key}.mp3`), gain, ...(dur ? { dur: r3(dur) } : {}) });

// ---------- which scenes, and their timing ----------
const pick = script.scenes.map((sc, oi) => ({ ...sc, oi })).filter((sc) => !VERT || VERT.includes(sc.id));
if (VERT && pick.length !== VERT.length) throw new Error(`--vertical: unknown scene id in ${VERT.join(",")}`);
const HOOK = !VERT && script.hook ? script.hook : null;
const scenes = [];
let T = 0, year = script.year0 ?? new Date().getFullYear();
pick.forEach((sc, i) => {
  const vo = words[`vo-${sc.oi + 1}`];
  const first = [];
  let k = 0;
  for (const s of sc.text.split(/(?<=[.?!])\s+/)) { first.push(k); k += toks(s).length; }
  const roll = sc.year != null && String(sc.year) !== String(year) && !(HOOK && i === 0) ? { from: year, to: sc.year } : null;
  if (sc.year != null) year = sc.year;
  const start = T, voStart = start + (i === 0 ? 0.35 : VO_IN) + (roll ? ROLL_LEAD : 0);
  const sentT = first.map((ti) => voStart + vo.words[Math.min(ti, vo.words.length - 1)][0]);
  const end = voStart + vo.dur + (script.tail ?? 0.6);
  scenes.push({ ...sc, i, start, voStart, end, sentT, vo, roll });
  T = end;
});
const TOTAL = r3(T + END_HOLD);
const at = (sc, a) => (typeof a === "number" ? sc.voStart + a : sc.sentT[Math.min(a[0], sc.sentT.length - 1)] + a[1]);
const hookEnd = HOOK ? at(scenes[0], HOOK.until || [1, 0]) : 0;

await loadImgs(Object.values(scenesL).flatMap((L) => L.items || []));
// blocks: which grid cells of each sprite (at its on-screen size) actually hold pixels
const blockAlpha = {};
for (const L of Object.values(scenesL)) for (const it of L.items) {
  if (!it.obj || (it.anim || S.reveal) !== "blocks") continue;
  const g = geo(it), C = S.objBlock || 24, cols = Math.ceil(g.w / C), rows = Math.ceil(g.h / C), key = `${it.obj}|${cols}x${rows}`;
  if (blockAlpha[key]) continue;
  const { data } = await sharp(`assets/obj/${it.obj}.png`).ensureAlpha().extractChannel(3).resize(cols, rows, { kernel: "cubic", fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  blockAlpha[key] = data;
}

const tw = [], pages = [], overlays = [], css = new Map(), late = {};
const imgClass = (src) => { const key = "bi-" + src.replace(/[^a-z0-9]/gi, "_"); css.set(key, `.${key}{background-image:url(${src})}`); return key; };

for (const sc of scenes) {
  const id = sc.id, L = scenesL[id];
  if (!L) throw new Error(`scenes.json has no "${id}"`);
  const E = eraOf(L);
  const els = [], ink = [];
  let seed = sc.oi * 97 + 13;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // hand keyframes [t, x, y]; items are drawn one after another (the hand is never in two places)
  const hand = [];
  let handFree = sc.start + TRANS * 0.6 + (sc.roll ? ROLL_LEAD : 0), handOn = false;
  const minT = sc.i === 0 && HOOK ? hookEnd + 0.3 : 0; // nothing is drawn under the hook cover
  const items = expandItems(L.items, E).map((it, n) => ({ ...it, n, t: Math.max(at(sc, it.at || [0, 0]), minT) })).sort((a, b) => a.t - b.t || a.n - b.n);
  const animOf = (x) => x.anim || (x.text || x.arrow || x.line || x.shape ? "draw" : x.count ? "count" : x.image ? "image" : S.reveal);

  items.forEach((it, j) => {
    const anim = animOf(it);
    const z = it.z ?? 10 + it.n;
    if (anim === "draw") {
      // strokes in page space: [{d, len, pts[[x,y]], width, color, tf?}]
      const strokes = [];
      let fillEl = null;
      if (it.obj) {
        const g = geo(it), tr = JSON.parse(fs.readFileSync(`assets/obj/${it.obj}.trace.json`, "utf8")), k = g.w / tr.w;
        const fx = (x) => (it.flip ? g.x + (tr.w - x) * k : g.x + x * k);
        // potrace curves stay in object space (smooth); a transform places them on the page
        const tf = it.flip ? `translate(${r1(g.x + tr.w * k)} ${r1(g.y)}) scale(${-k} ${k})` : `translate(${r1(g.x)} ${r1(g.y)}) scale(${k})`;
        for (const p of tr.paths) {
          if (p.len * k < INK.minLen) continue;
          const pts = p.pts.map(([x, y]) => [fx(x), g.y + y * k]);
          strokes.push({ d: p.d.replace(/-?\d+\.\d+/g, (m) => String(r1(+m))), len: p.len * 1.03 + 2, slen: p.len * k, pts, width: INK.width / k, color: E.ink, tf });
        }
        const cls = imgClass(`assets/obj/${it.obj}.png`);
        const filt = E.objFilter !== "none" ? `filter:${E.objFilter};` : "";
        fillEl = `<div id="${id}i${it.n}" class="obj ${cls}" style="left:${r1(g.x)}px;top:${r1(g.y)}px;width:${r1(g.w)}px;height:${r1(g.h)}px;z-index:${z};${it.flip ? "transform:scaleX(-1);" : ""}${filt}"></div>`;
      } else if (it.text) {
        const t = textLayout(it, E);
        for (const d of t.glyphs) {
          const pp = new svgPathProperties(d), len = pp.getTotalLength();
          const n = Math.max(2, Math.min(8, Math.ceil(len / 40))), pts = [];
          for (let q = 0; q <= n; q++) { const P = pp.getPointAtLength((len * q) / n); pts.push([P.x, P.y]); }
          strokes.push({ d, len: len + 2, pts, width: Math.max(1.6, (it.size || 64) / 38), color: t.color });
        }
        fillEl = `<svg id="${id}i${it.n}" class="txt" width="${W}" height="${H}" style="z-index:${z}"><path d="${t.glyphs.join(" ")}" fill="${t.color}"/></svg>`;
      } else if (it.line || it.shape) {
        const d = it.line ? linePath(it.line) : shapePath(it, rnd), color = it.stroke || it.color || E.ink, width = it.width || (it.shape ? 4 : 5);
        for (const sub of d.split(/(?=M)/).map((x) => x.trim()).filter(Boolean)) {
          const pp = new svgPathProperties(sub), len = pp.getTotalLength(), n = Math.max(2, Math.min(10, Math.ceil(len / 60))), pts = [];
          for (let q = 0; q <= n; q++) { const P = pp.getPointAtLength((len * q) / n); pts.push([P.x, P.y]); }
          strokes.push({ d: sub, len: len + 2, pts, width, color });
        }
        fillEl = `<svg id="${id}i${it.n}" class="txt" width="${W}" height="${H}" style="z-index:${z}"><path d="${d}" fill="${it.fill || "none"}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      } else if (it.arrow) {
        for (const d of arrowPath(it.arrow, it.bend)) {
          const pp = new svgPathProperties(d), len = pp.getTotalLength(), pts = [];
          for (let q = 0; q <= 6; q++) { const P = pp.getPointAtLength((len * q) / 6); pts.push([P.x, P.y]); }
          strokes.push({ d, len: len + 2, pts, width: it.width || 5, color: it.color || E.ink });
        }
      }
      for (const s of strokes) s.slen ??= s.len;
      const Ltot = strokes.reduce((a, s) => a + s.slen, 0);
      const t0 = Math.max(it.t, handFree + (handOn ? 0.15 : 0.4));
      let d = Math.min(it.maxDur || 3.2, Math.max(0.5, Ltot / SPEED));
      // the hand speeds up near the end of the scene so the drawing is finished before the page turns
      const room = sc.end - 0.9 - Math.max(it.t, handFree + (handOn ? 0.15 : 0.4));
      if (room < d) d = Math.max(0.3, room);
      // hand travels to the first stroke
      if (strokes.length) {
        const p0 = strokes[0].pts[0];
        if (!handOn) hand.push([t0 - 0.4, W + 120, H + 160]);
        hand.push([t0, p0[0], p0[1]]);
        cue(t0, "scribble", S.sfxGain?.scribble ?? -12, d);
      }
      let acc = 0;
      const grp = [];
      strokes.forEach((s, q) => {
        const pid = `${id}s${it.n}_${q}`;
        const ta = t0 + (acc / (Ltot || 1)) * d, td = (s.slen / (Ltot || 1)) * d;
        const p = `<path id="${pid}" d="${s.d}" style="stroke:${s.color};stroke-width:${r3(s.width)};stroke-dasharray:${r1(s.len)};stroke-dashoffset:${r1(s.len)}"/>`;
        grp.push(s.tf ? `<g transform="${s.tf}">${p}</g>` : p);
        tw.push(td < 0.02 ? `tl.set("#${pid}",{strokeDashoffset:0},${r3(ta)});` : `tl.to("#${pid}",{strokeDashoffset:0,duration:${r3(td)},ease:"none"},${r3(ta)});`);
        const n = Math.max(2, Math.min(6, Math.ceil(s.len / 70)));
        for (let m = 0; m <= n; m++) { const P = s.pts[Math.round((m / n) * (s.pts.length - 1))]; hand.push([ta + (m / n) * td, P[0], P[1]]); }
        acc += s.slen;
      });
      ink.push(`<g id="${id}g${it.n}">${grp.join("")}</g>`);
      const tEnd = t0 + d;
      if (tEnd > sc.end - 0.4) late[id] = Math.max(late[id] || 0, tEnd - (sc.end - 0.4));
      if (fillEl) {
        els.push(fillEl);
        const flat = it.text || it.line || it.shape, tf0 = flat ? tEnd - 0.1 : t0 + d * 0.75, fd = flat ? 0.35 : 0.6;
        tw.push(`tl.fromTo("#${id}i${it.n}",{opacity:0},{opacity:1,duration:${fd},ease:"power1.inOut"},${r3(tf0)});`);
        tw.push(`tl.to("#${id}g${it.n}",{opacity:0,duration:0.4,ease:"power1.in"},${r3(Math.max(tf0 + fd, tEnd) + 0.05)});`);
      }
      handFree = tEnd;
      handOn = true;
      const next = items.slice(j + 1).find((x) => animOf(x) === "draw");
      if (!next || next.t > tEnd + 1.4) { hand.push([tEnd + 0.15, hand.at(-1)[1], hand.at(-1)[2]]); hand.push([tEnd + 0.75, W + 160, H + 220]); handOn = false; handFree = tEnd + 0.75; }
    } else if (anim === "count") {
      // a number counting up: pre-rendered steps switched on one after another (seek-safe, no per-frame script)
      const [v0, v1] = it.count, N = it.steps || 16, size = it.size || 120, color = it.color || ACC;
      it.t = Math.min(Math.max(it.t, handFree + 0.1), sc.end - 1.0); // wait for the drawing, but finish before the page turns
      const dur = Math.max(0.4, Math.min(it.dur || 1.3, sc.end - 0.5 - it.t));
      for (let q = 0; q <= N; q++) {
        const v = v0 + ((v1 - v0) * (1 - Math.pow(1 - q / N, 2.2)));
        const cid = `${id}c${it.n}_${q}`;
        els.push(`<svg id="${cid}" class="txt" width="${W}" height="${H}" style="z-index:${z}"><path d="${glyphs(countText(it, q === N ? v1 : v), it.x, it.y, size, it.align).join(" ")}" fill="${color}"/></svg>`);
        const tq = it.t + (q / N) * dur;
        tw.push(`tl.set("#${cid}",{opacity:1},${r3(tq)});`);
        if (q < N) tw.push(`tl.set("#${cid}",{opacity:0},${r3(it.t + ((q + 1) / N) * dur)});`);
      }
      cue(it.t, "tick", S.sfxGain?.tick ?? -10, dur);
    } else if (anim === "image") {
      const g = imgGeo(it), cls = imgClass(it.image), frame = it.frame || "none", tilt = it.tilt ?? (frame === "clip" ? -2.5 : 0);
      const filt = frame === "none" && E.objFilter !== "none" ? `filter:${E.objFilter};` : "";
      const inner = frame === "clip" ? `<div class="pic ${cls}"></div><div class="tape" style="left:10%"></div><div class="tape r" style="right:10%"></div>` : "";
      els.push(`<div id="${id}i${it.n}" class="img ${frame}${frame === "clip" ? "" : " " + cls}" style="left:${r1(g.x)}px;top:${r1(g.y)}px;width:${r1(g.w)}px;height:${r1(g.h)}px;z-index:${z};transform:rotate(${tilt}deg);${filt}">${inner}</div>`);
      if (frame === "clip") { tw.push(`tl.fromTo("#${id}i${it.n}",{opacity:0,scale:1.16,rotation:${tilt - 7},y:-46},{opacity:1,scale:1,rotation:${tilt},y:0,duration:0.75,ease:"back.out(1.5)"},${r3(it.t)});`); cue(it.t, "pop", S.sfxGain?.pop ?? -9); }
      else tw.push(`tl.fromTo("#${id}i${it.n}",{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.6,ease:"power2.out"},${r3(it.t)});`);
    } else if (anim === "blocks") {
      const g = geo(it), C = S.objBlock || 24, cls = imgClass(`assets/obj/${it.obj}.png`);
      const cols = Math.ceil(g.w / C), rows = Math.ceil(g.h / C);
      const list = [], alpha = blockAlpha[`${it.obj}|${cols}x${rows}`];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (alpha[r * cols + c] > 20) list.push([r, c]);
      list.sort((a, b) => b[0] - a[0] || (a[1] + rnd() * 3) - (b[1] + rnd() * 3));
      const d = Math.min(2.2, Math.max(0.6, list.length / 140));
      const bw = r1(g.w), bh = r1(g.h), blk = [];
      list.forEach(([r, c], q) => {
        const cid = `${id}b${it.n}_${r}_${c}`, x = c * C, y = r * C;
        blk.push(`<div id="${cid}" class="blk ${cls}" style="left:${x}px;top:${y}px;width:${C}px;height:${C}px;background-size:${bw}px ${bh}px;background-position:${-x}px ${-y}px"></div>`);
        tw.push(`tl.fromTo("#${cid}",{opacity:0,scale:0.3},{opacity:1,scale:1,duration:0.2,ease:"back.out(2.4)"},${r3(it.t + (q / Math.max(1, list.length)) * d)});`);
      });
      els.push(`<div class="bwrap" style="left:${r1(g.x)}px;top:${r1(g.y)}px;width:${bw}px;height:${bh}px;z-index:${z};${it.flip ? "transform:scaleX(-1);" : ""}">${blk.join("")}</div>`);
    } else {
      const g = geo(it), cls = imgClass(`assets/obj/${it.obj}.png`);
      const filt = E.objFilter !== "none" ? `filter:${E.objFilter};` : "";
      els.push(`<div id="${id}i${it.n}" class="obj ${cls}${S.objShadow ? " shd" : ""}" style="left:${r1(g.x)}px;top:${r1(g.y)}px;width:${r1(g.w)}px;height:${r1(g.h)}px;z-index:${z};transform-origin:50% 100%;${filt}"></div>`);
      const flip = it.flip ? ",scaleX:-1" : "";
      if (anim === "pop") { tw.push(`tl.fromTo("#${id}i${it.n}",{opacity:0,scale:0.55,y:-70${flip}},{opacity:1,scale:1,y:0${flip},duration:0.8,ease:"back.out(1.9)"},${r3(it.t)});`); cue(it.t, "pop", S.sfxGain?.pop ?? -8); }
      else tw.push(`tl.fromTo("#${id}i${it.n}",{opacity:0,y:30,scale:1.02${flip}},{opacity:1,y:0,scale:1${flip},duration:1.0,ease:"power2.out"},${r3(it.t)});`);
    }
    // extra sound from the channel set (brand/sfx): "sfx": "ding" on any item, "sfxAt": seconds after the item appears
    if (it.sfx) cue(it.t + (it.sfxAt || 0), it.sfx, S.sfxGain?.[it.sfx] ?? -10);
  });

  // hand keyframes -> tweens (seek-safe: each keyframe is a short linear move from the previous one)
  if (hand.length) {
    hand.sort((a, b) => a[0] - b[0]);
    tw.push(`tl.set("#${id}-hand",{x:${W + 160},y:${H + 220}},${r3(sc.start)});`);
    let prev = Math.round(sc.start * 1000); // integer milliseconds: tweens end exactly where the next begins
    for (const [t, x, y] of hand) {
      const tt = Math.max(Math.round(t * 1000), prev + 1);
      tw.push(`tl.to("#${id}-hand",{x:${r1(x)},y:${r1(y)},duration:${(tt - prev) / 1000},ease:"none"},${prev / 1000});`);
      prev = tt;
    }
  }

  // emphasis marks (accent colour): circle, underline, highlighter
  const marks = [];
  if (MARK) (L.marks || []).forEach((m, mi) => {
    const t = Math.max(at(sc, m.at), minT), kind = m.circle ? "circle" : m.highlight ? "highlight" : "underline";
    const { d, len } = wobble(kind, m.circle || m.highlight || m.underline, rnd);
    marks.push(`<path id="${id}m${mi}" class="${kind === "highlight" ? "hl" : ""}" d="${d}" style="stroke-dasharray:${len};stroke-dashoffset:${len}"/>`);
    tw.push(`tl.to("#${id}m${mi}",{strokeDashoffset:0,duration:${kind === "circle" ? 0.7 : 0.45},ease:"power1.inOut"},${r3(t)});`);
    if (kind === "circle") cue(t, "pop", S.sfxGain?.mark ?? -14);
  });

  // camera
  let camEnd = sc.start;
  (L.cam || [{ box: "full" }]).forEach((c, ci) => {
    let s = 1, x = 0, y = 0;
    if (c.box !== "full") {
      const [x1, y1, x2, y2] = c.box, bw = x2 - x1, bh = y2 - y1;
      s = Math.min(S.maxZoom || 1.15, Math.max(1, Math.min((0.9 * W) / bw, (0.86 * H) / bh)));
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      x = Math.min(0, Math.max(W - W * s, W / 2 - cx * s));
      y = Math.min(0, Math.max(H - H * s, H / 2 - cy * s));
    }
    const target = `{x:${r1(x)},y:${r1(y)},scale:${r3(s)}`;
    const t = ci === 0 ? sc.start : Math.max(at(sc, c.at), camEnd + 0.02, minT);
    if (ci === 0) { tw.push(`tl.set("#${id}-cam",${target}},${r3(sc.start)});`); return; }
    const dur = c.dur || 1.4;
    tw.push(`tl.to("#${id}-cam",${target},duration:${dur},ease:"power2.inOut"},${r3(t)});`);
    camEnd = t + dur;
  });

  // page transition (a new sheet slides in; the old one drifts left and dims)
  if (sc.i > 0) {
    tw.unshift(`tl.set("#${id}-page",{x:${W + 40}},0);`);
    tw.push(`tl.fromTo("#${id}-page",{x:${W + 40}},{x:0,duration:${TRANS},ease:"power3.inOut"},${r3(sc.start)});`);
    const prev = scenes[sc.i - 1].id;
    tw.push(`tl.to("#${prev}-page",{x:${-W * 0.18},duration:${TRANS},ease:"power3.inOut"},${r3(sc.start)});`);
    tw.push(`tl.to("#${prev}-dim",{opacity:0.35,duration:${TRANS},ease:"power1.in"},${r3(sc.start)});`);
    tw.push(`tl.set("#${prev}-page",{autoAlpha:0},${r3(sc.start + TRANS + 0.02)});`);
    cue(sc.start, "whoosh", S.sfxGain?.whoosh ?? -9);
  }

  // year roll: the year rolls from the old to the new one while the new page arrives
  if (sc.roll) {
    const a = Number(sc.roll.from), b = Number(sc.roll.to), N = 12, t0 = sc.start + 0.35, dur = 0.95;
    const label = sc.yearLabel || "", steps = [];
    for (let q = 0; q <= N; q++) {
      const v = Number.isFinite(a) && Number.isFinite(b) ? Math.round(a + (b - a) * (1 - Math.pow(1 - q / N, 2))) : q === N ? sc.roll.to : sc.roll.from;
      steps.push(`<path id="${id}y${q}" d="${glyphs(String(v), W / 2, H / 2 + 30, 230).join(" ")}" fill="${ACC}" opacity="0"/>`);
      tw.push(`tl.set("#${id}y${q}",{opacity:1},${r3(t0 + (q / N) * dur)});`);
      if (q < N) tw.push(`tl.set("#${id}y${q}",{opacity:0},${r3(t0 + ((q + 1) / N) * dur)});`);
    }
    const dir = Number(b) < Number(a) ? (S.rollWords?.back || "tua lại") : (S.rollWords?.fwd || "tua tới");
    overlays.push(`<svg id="${id}-roll" class="roll" width="${W}" height="${H}"><path d="${glyphs(label ? `${label}` : dir, W / 2, H / 2 - 170, 76).join(" ")}" fill="${E.text}"/><path d="${glyphs(label ? dir : "", W / 2, H / 2 + 200, 48).join(" ")}" fill="${E.text}" opacity="0.55"/>${steps.join("")}</svg>`);
    tw.push(`tl.fromTo("#${id}-roll",{opacity:0,scale:0.92},{opacity:1,scale:1,duration:0.3,ease:"power2.out"},${r3(sc.start + 0.2)});`);
    tw.push(`tl.to("#${id}-roll",{opacity:0,scale:1.04,duration:0.35,ease:"power1.in"},${r3(sc.voStart - 0.4)});`);
    cue(t0, "rewind", S.sfxGain?.rewind ?? -8);
  }

  const bgStyle = isBgColor(L.bg) || !L.bg ? `background-color:${E.pageBg};${E.pattern !== "none" ? `background-image:${E.pattern};` : ""}` : "background:#000";
  const plateEl = isBgColor(L.bg) ? "" : `<div class="plate" style="background-image:url(assets/obj/${L.bg}.jpg)"></div>`;
  const penEl = PEN.type === "spark" ? `<div class="halo"></div><div class="spark"></div>` : `<img src="assets/hand.png" alt="" style="width:${HW}px;margin-left:${r1(-HAND.tipX * HS)}px;margin-top:${r1(-HAND.tipY * HS)}px">`;
  const handEl = hand.length ? `<div id="${id}-hand" class="hand">${penEl}</div>` : "";
  pages.push(`<div id="${id}-page" class="page" style="z-index:${sc.i + 1};${bgStyle}">
        ${S.grain ? `<div class="grain"></div>` : ""}${E.vignette ? `<div class="vig"></div>` : ""}
        <div id="${id}-cam" class="cam">
          ${plateEl}
          ${els.join("\n          ")}
          <svg class="ink" width="${W}" height="${H}">${ink.join("")}</svg>
          <svg class="marks" width="${W}" height="${H}">${marks.join("")}</svg>
          ${handEl}
        </div>
        <div id="${id}-dim" class="dim"></div>
      </div>`);
}

// ---------- stage strip: the video's stages, the current one circled in the accent colour ----------
let strip = "";
if (scenes.some((sc) => stageOf(scenesL[sc.id]))) {
  const size = STRIP_SIZE, gap = STRIP_GAP, y = 50;
  let x = 44;
  const parts = [], rings = [], ringLen = {};
  STAGES.forEach(({ key: k, label }, ki) => {
    const w = textW(label, size);
    parts.push(`<path id="era-${k}" d="${glyphs(label, x, y, size, "left").join(" ")}" fill="${PLAIN.text}" opacity="0.32"/>`);
    let sd = 7 + ki * 31;
    const { d, len } = wobble("circle", [x + w / 2, y + 2, w / 2 + 20, size * 0.62], () => (sd = (sd * 16807) % 2147483647) / 2147483647);
    ringLen[k] = len;
    rings.push(`<path id="ring-${k}" d="${d}" style="stroke-dasharray:${len};stroke-dashoffset:${len}"/>`);
    if (ki < STAGES.length - 1) parts.push(`<path d="${glyphs("·", x + w + gap / 2, y, size).join(" ")}" fill="${PLAIN.text}" opacity="0.32"/>`);
    x += w + gap;
  });
  strip = `<svg id="strip" width="${x + 40}" height="110"><g class="rings">${rings.join("")}</g>${parts.join("")}</svg>`;
  let cur = null;
  scenes.forEach((sc) => {
    const era = stageOf(scenesL[sc.id]), t = sc.i === 0 ? (HOOK ? hookEnd : 0) : sc.start + 0.3;
    if (era === cur) return;
    if (cur) {
      tw.push(`tl.to("#era-${cur}",{opacity:0.32,fill:"${PLAIN.text}",duration:0.3},${r3(t)});`);
      tw.push(`tl.to("#ring-${cur}",{opacity:0,duration:0.25},${r3(t)});`);
    }
    if (era) {
      tw.push(`tl.to("#era-${era}",{opacity:1,fill:"${ACC}",duration:0.3},${r3(t)});`);
      tw.push(`tl.fromTo("#ring-${era}",{opacity:1,strokeDashoffset:${ringLen[era]}},{opacity:1,strokeDashoffset:0,duration:0.6,ease:"power1.inOut"},${r3(t + 0.1)});`);
    }
    tw.push(`tl.to("#strip",{opacity:${era ? 1 : 0},duration:0.3},${r3(t)});`);
    cur = era;
  });
  if (!stageOf(scenesL[scenes[0].id]) || HOOK) tw.unshift(`tl.set("#strip",{opacity:0},0);`);
}

// ---------- hook cover: visible from frame 0 (muted autoplay / thumbnail), turned away like a page ----------
let cover = "";
if (HOOK) {
  const E = eraOf(scenesL[scenes[0].id]), size = HOOK.size || 124;
  const hasObj = HOOK.obj && index[HOOK.obj];
  const tx = hasObj ? W * 0.4 : W / 2, ty = H * 0.44;
  const gl = glyphs(HOOK.text, tx, ty, size);
  const nLines = String(HOOK.text).split("\n").length, lastW = textW(String(HOOK.text).split("\n").at(-1), size);
  const ulY = ty + (nLines / 2) * size * 1.12 + 26;
  let sd = 5;
  const ul = wobble("underline", [tx - lastW / 2, ulY, tx + lastW / 2], () => (sd = (sd * 16807) % 2147483647) / 2147483647);
  let objEl = "";
  if (hasObj) {
    const g = geo({ obj: HOOK.obj, x: W * 0.78, y: H * 0.5, h: HOOK.objH || 620 });
    objEl = `<div class="obj ${imgClass(`assets/obj/${HOOK.obj}.png`)}" style="opacity:1;left:${r1(g.x)}px;top:${r1(g.y)}px;width:${r1(g.w)}px;height:${r1(g.h)}px"></div>`;
  }
  cover = `<div id="cover" class="page" style="z-index:500;background-color:${E.pageBg};${E.pattern !== "none" ? `background-image:${E.pattern};` : ""}">
        ${S.grain ? `<div class="grain"></div>` : ""}${objEl}
        <svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible"><path d="${gl.join(" ")}" fill="${E.text}"/>
          <path id="cover-ul" d="${ul.d}" fill="none" stroke="${ACC}" stroke-width="10" stroke-linecap="round" style="stroke-dasharray:${ul.len};stroke-dashoffset:${ul.len}"/></svg>
      </div>`;
  tw.push(`tl.to("#cover-ul",{strokeDashoffset:0,duration:0.5,ease:"power1.inOut"},0.25);`);
  tw.push(`tl.to("#cover",{x:${-W - 60},duration:${TRANS},ease:"power3.inOut"},${r3(hookEnd - TRANS * 0.4)});`);
  cue(hookEnd - TRANS * 0.4, "whoosh", S.sfxGain?.whoosh ?? -9);
}

// ---------- captions ----------
const caps = [];
let n = 0;
const MAXL = VERT ? 30 : 46;
scenes.forEach((sc) => {
  const ws = sc.vo.words, st = toks(sc.text);
  const lines = [];
  let cur = [];
  st.forEach((tok, j) => {
    cur.push(j);
    const len = cur.map((q) => st[q]).join(" ").length;
    if (/[.?!:]$/.test(tok) || (/,$/.test(tok) && len > MAXL * 0.52) || len > MAXL) { lines.push(cur); cur = []; }
  });
  if (cur.length) lines.push(cur);
  for (let li = 0; li < lines.length - 1; li++) {
    if (lines[li].map((q) => st[q]).join(" ").length < 14) { lines[li + 1] = [...lines[li], ...lines[li + 1]]; lines.splice(li, 1); li--; }
  }
  lines.forEach((ln, li) => {
    const cid = `c${n++}`;
    const a = sc.voStart + ws[ln[0]][0];
    const b = lines[li + 1] ? sc.voStart + ws[lines[li + 1][0]][0] : sc.voStart + ws[ln.at(-1)][1] + 0.35;
    // no full stop or comma at the end of a caption line (user rule 2026-10-22); ? and ! stay
    caps.push(`<div id="${cid}" class="cap"><span>${ln.map((q, k) => `<b id="${cid}w${q}">${esc(k === ln.length - 1 ? st[q].replace(/[.,;:]+$/, "") : st[q])}</b>`).join(" ")}</span></div>`);
    tw.push(`tl.set("#${cid}",{opacity:1},${r3(a - 0.02)});`, `tl.set("#${cid}",{opacity:0},${r3(b - 0.03)});`);
    if (CAP.active !== CAP.color) ln.forEach((q) => tw.push(`tl.set("#${cid}w${q}",{color:"${CAP.active}"},${r3(sc.voStart + ws[q][0])});`, `tl.set("#${cid}w${q}",{color:"${CAP.color}"},${r3(sc.voStart + ws[q][1] + 0.04)});`));
  });
});

// ---------- vertical teaser: title band, card, CTA ----------
let vTop = "";
if (VERT) {
  const tv = script.teaser || {}, title = tv.title || script.hook?.text || script.title;
  const ts = tv.titleSize || 96, tl1 = glyphs(title, 540, 330, ts);
  vTop = `<svg id="vtitle" width="1080" height="560" style="position:absolute;left:0;top:0"><path d="${tl1.join(" ")}" fill="${PLAIN.text}"/></svg>`;
  if (tv.cta) {
    vTop += `<svg id="vcta" width="1080" height="560" style="position:absolute;left:0;top:0;opacity:0"><path d="${glyphs(tv.cta, 540, 330, tv.ctaSize || 84).join(" ")}" fill="${ACC}"/></svg>`;
    tw.push(`tl.to("#vtitle",{opacity:0,duration:0.3},${r3(T + 0.2)});`, `tl.to("#vcta",{opacity:1,duration:0.4},${r3(T + 0.3)});`);
  }
}

const audio = scenes.map((sc) => `<audio id="vo${sc.oi + 1}" src="assets/vo/vo-${sc.oi + 1}.mp3" data-start="${r3(sc.voStart)}" data-duration="${sc.vo.dur}" data-track-index="2" data-volume="1"></audio>`);
const capText = CAP.outline
  ? `-webkit-text-stroke: 9px ${CAP.outline}; paint-order: stroke fill; text-shadow: 0 3px 10px rgba(0,0,0,0.45);`
  : `text-shadow: 0 0 6px ${CAP.glow}, 0 0 14px ${CAP.glow}, 0 0 22px ${CAP.glow}, 0 0 30px ${CAP.glow};`;
const bug = BRAND ? `<div id="bug">${BRAND.icon && fs.existsSync(`assets/img/${BRAND.icon}`) ? `<img src="assets/img/${BRAND.icon}" alt="">` : ""}<span>${esc(BRAND.name)}</span></div>` : "";
const CW = VERT ? 1080 : W, CH = VERT ? 1920 : H;
const VS = 0.75, VX = (1080 - W * VS) / 2, VY = 560; // teaser card: the page at 75 %, centre crop to the Reel width

const stage = `<div id="stage">
        ${pages.join("\n        ")}
        ${overlays.join("\n        ")}
        ${cover}
        ${VERT ? "" : strip}
      </div>`;

const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${CW}, height=${CH}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Be Vietnam Pro"; font-weight: 600; src: url("assets/fonts/BeVietnamPro-SemiBold.ttf"); }
      @font-face { font-family: "Hand"; src: url("assets/fonts/hand.ttf"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${CW}px; height: ${CH}px; overflow: hidden; background: ${PLAIN.pageBg}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${PLAIN.pageBg}; }
      ${VERT
        ? `#frame { position: absolute; left: 0; top: ${VY}px; width: 1080px; height: ${r1(H * VS)}px; overflow: hidden; border-top: 3px solid ${PLAIN.text}22; border-bottom: 3px solid ${PLAIN.text}22; }
      #stage { position: absolute; left: ${r1(VX)}px; top: 0; width: ${W}px; height: ${H}px; transform: scale(${VS}); transform-origin: 0 0; }`
        : `#stage { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }`}
      .page { position: absolute; inset: 0; overflow: hidden; box-shadow: -24px 0 50px rgba(20, 15, 30, 0.25); }
      .grain { position: absolute; inset: 0; background-image: ${GRAIN}; pointer-events: none; z-index: 1; }
      .vig { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(90,60,20,0.22) 100%); pointer-events: none; z-index: 2; }
      .cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; z-index: 3; }
      .plate { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; background-size: ${W}px ${H}px; background-repeat: no-repeat; z-index: 0; }
      .obj { position: absolute; opacity: 0; background-size: 100% 100%; background-repeat: no-repeat; }
      .shd { filter: ${S.objShadow || "none"}; }
      .bwrap { position: absolute; }
      .blk { position: absolute; opacity: 0; background-repeat: no-repeat; image-rendering: pixelated; }
      .txt { position: absolute; left: 0; top: 0; opacity: 0; overflow: visible; }
      .img { position: absolute; opacity: 0; background-size: contain; background-repeat: no-repeat; background-position: center; }
      .img.clip { background: #fffdf7; box-shadow: 0 12px 28px rgba(40, 30, 20, 0.22); border-radius: 3px; }
      .img .pic { position: absolute; inset: 14px; background-size: contain; background-repeat: no-repeat; background-position: center top; }
      .img .tape { position: absolute; top: -18px; width: 120px; height: 36px; background: rgba(236, 222, 178, 0.85); transform: rotate(-5deg); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
      .img .tape.r { transform: rotate(6deg); }
      .ink { position: absolute; left: 0; top: 0; z-index: 900; overflow: visible; pointer-events: none; }
      .ink path { fill: none; stroke-linecap: butt; stroke-linejoin: round; }
      .marks { position: absolute; left: 0; top: 0; z-index: 901; overflow: visible; }
      .marks path { fill: none; stroke: ${MARK || "none"}; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; }
      .marks path.hl { stroke-width: 40; opacity: 0.4; mix-blend-mode: multiply; stroke: ${S.highlight || MARK || "none"}; }
      .hand { position: absolute; left: 0; top: 0; z-index: 950; pointer-events: none; }
      .hand img { display: block; filter: drop-shadow(-10px 14px 14px rgba(0,0,0,0.22)); }
      .hand .spark { position: absolute; width: ${PEN.size}px; height: ${PEN.size}px; left: ${-PEN.size / 2}px; top: ${-PEN.size / 2}px; border-radius: 50%;
        background: radial-gradient(circle, #ffffff 0 20%, ${PENC} 38%, ${PENC}66 58%, ${PENC}00 72%); }
      .hand .halo { position: absolute; width: ${PEN.size * 3.2}px; height: ${PEN.size * 3.2}px; left: ${-PEN.size * 1.6}px; top: ${-PEN.size * 1.6}px; border-radius: 50%;
        background: radial-gradient(circle, ${PENC}38 0%, ${PENC}14 40%, ${PENC}00 70%); }
      .dim { position: absolute; inset: 0; background: #1c1828; opacity: 0; pointer-events: none; z-index: 980; }
      .roll { position: absolute; left: 0; top: 0; z-index: 400; opacity: 0; overflow: visible; transform-origin: 50% 50%; pointer-events: none; }
      #strip { position: absolute; left: 0; top: 0; z-index: 600; overflow: visible; }
      #strip .rings path { fill: none; stroke: ${ACC}; stroke-width: 4; stroke-linecap: round; }
      #bug { position: absolute; ${VERT ? "left: 0; right: 0; top: 70px; justify-content: center;" : "right: 34px; top: 22px;"} z-index: 700; display: flex; align-items: center; gap: 12px; opacity: 0.95; }
      #bug img { width: ${VERT ? 84 : 60}px; height: ${VERT ? 84 : 60}px; object-fit: contain; }
      #bug span { font-family: "Hand", sans-serif; font-size: ${VERT ? 54 : 40}px; color: ${PLAIN.text}; }
      #caps { position: absolute; left: 0; right: 0; ${VERT ? `top: ${r1(VY + H * VS + 120)}px; padding: 0 60px;` : "bottom: 40px;"} height: 90px; z-index: 800; }
      .cap { position: absolute; left: 0; right: 0; text-align: center; opacity: 0; }
      .cap span { font-family: "Be Vietnam Pro", sans-serif; font-weight: 600; font-size: ${VERT ? 58 : 42}px; line-height: 1.3; color: ${CAP.color}; ${capText} }
      .cap b { font-weight: 600; }
      ${[...css.values()].join(" ")}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${VERT ? "teaser" : "main"}" data-start="0" data-duration="${TOTAL}" data-width="${CW}" data-height="${CH}">
      ${VERT ? `${vTop}<div id="frame">${stage}</div>` : stage}
      ${bug}
      <div id="caps">${caps.join("")}</div>
      ${audio.join("\n      ")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${tw.join("\n      ")}
      window.__timelines = window.__timelines || {}; // the dashboard plays the page in a plain browser
      window.__timelines["${VERT ? "teaser" : "main"}"] = tl;
    </script>
  </body>
</html>
`;
if (VERT) {
  // the Reel is its own small HyperFrames project (one root composition per project), with copies of the assets it uses
  fs.rmSync("teaser", { recursive: true, force: true });
  fs.mkdirSync("teaser", { recursive: true });
  for (const f of ["hyperframes.json", "meta.json", "package.json"]) if (fs.existsSync(f)) fs.copyFileSync(f, path.join("teaser", f));
  for (const a of new Set(html.match(/assets\/[^"')\s]+/g) || [])) {
    if (!fs.existsSync(a)) continue;
    fs.mkdirSync(path.dirname(path.join("teaser", a)), { recursive: true });
    fs.copyFileSync(a, path.join("teaser", a));
  }
  fs.writeFileSync("teaser/index.html", html);
} else fs.writeFileSync("index.html", html);
for (const [sid, over] of Object.entries(late)) console.log(`WARNING ${sid}: drawing runs ${over.toFixed(1)} s past the scene end (the page turns before it is finished): remove or merge items, add maxDur, or say a little more in that scene`);
fs.mkdirSync(".work", { recursive: true });
fs.writeFileSync(VERT ? ".work/sfx-teaser.json" : ".work/sfx.json", JSON.stringify({ total: TOTAL, cues: sfx.sort((a, b) => a.t - b.t) }, null, 1));
console.log(`${VERT ? "teaser/index.html" : "index.html"}: ${TOTAL}s (${(TOTAL / 60).toFixed(2)} min) · ${scenes.length} scenes · ${sfx.length} sound cues`);
scenes.forEach((s) => console.log(`${s.id} ${s.start.toFixed(1)}–${s.end.toFixed(1)}${s.roll ? ` · year ${s.roll.from} -> ${s.roll.to}` : ""}`));

#!/usr/bin/env node
// Voice-over for long videos, in chunks: script.json scenes are grouped into chunks of ~60–90 s (≤3 scenes,
// split only at scene boundaries). Each chunk is ONE Gemini TTS call (same voice, style, low temperature), so tone
// stays consistent inside a chunk without the drift that a 5–6 min single take gets. Every chunk is checked by
// voice-drift.py (2.5 s windows, pitch + timbre vs all chunks); drifted chunks are re-generated (up to 2 times,
// keeping the best). Chunks are trimmed and joined with a short pause into assets/vo/take.mp3, ready for
// <shorts>/words.py, which cuts it per scene (assets/audio.json "lines" = scene texts).
// Usage (project dir): node <sk>/scripts/voice.mjs [--max 85] [--only 2,4]   (--only re-does those chunks)
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = Number(arg("--max", 85));
const ONLY = arg("--only", "") ? arg("--only").split(",").map(Number) : null;

const DEFAULT_STYLE = "Nói tiếng Việt tự nhiên như một bạn trẻ đang giải thích một kiến thức hay cho bạn bè, giọng miền Nam nhẹ nhàng, ấm, tự tin, rõ chữ, không đọc như phát thanh viên, nhịp vừa phải. Giữ nguyên một giọng và một cảm xúc từ đầu đến cuối, nghỉ khoảng một giây giữa các đoạn.";


const script = JSON.parse(fs.readFileSync("script.json", "utf8"));
// script.json "voice": {"name": "Leda", "style": "...", "temperature": 0.35} sets the narrator per video
const VOICE = script.voice?.name || "Leda", TEMP = script.voice?.temperature ?? 0.35;
const STYLE = script.voice?.style || DEFAULT_STYLE;
const scenes = script.scenes;
fs.mkdirSync("assets/vo", { recursive: true });
fs.mkdirSync(".work", { recursive: true });
fs.writeFileSync("assets/audio.json", JSON.stringify({ voice: { name: VOICE, style: STYLE }, lines: scenes.map((s) => s.text) }, null, 1));

// ~4.2 Vietnamese syllables per second
const est = (t) => t.split(/\s+/).filter(Boolean).length / 4.2;
const chunks = [];
for (const [i, s] of scenes.entries()) {
  const last = chunks.at(-1);
  if (last && last.idx.length < 3 && last.sec + est(s.text) <= MAX) { last.idx.push(i); last.sec += est(s.text); }
  else chunks.push({ idx: [i], sec: est(s.text) });
}
console.log(`${chunks.length} chunks: ` + chunks.map((c, k) => `#${k + 1} ${c.idx.map((i) => scenes[i].id).join("+")} ~${Math.round(c.sec)}s`).join(" · "));

const file = (k) => `assets/vo/chunk-${k + 1}.wav`;
async function tts(k, attempt) {
  const c = chunks[k];
  const req = { model: "google/gemini-3-8-flash-tts", input: { temperature: TEMP, speakers: [{ speaker_id: "Speaker 1", voice_name: VOICE }],
    dialogue_turns: [{ speaker_id: "Speaker 1", style: STYLE, text: c.idx.map((i) => scenes[i].text).join("\n\n") }] } };
  const rq = `.work/vo-chunk-${k + 1}.req.json`;
  fs.writeFileSync(rq, JSON.stringify(req));
  for (let tries = 1; ; tries++) {
    try {
      const { stdout } = await run("node", [path.join(here, "kie.mjs"), rq, `.work/vo-chunk-${k + 1}-a${attempt}`], { maxBuffer: 1 << 24 });
      const src = JSON.parse(stdout.trim().split("\n").pop()).files[0];
      const out = `.work/vo-chunk-${k + 1}-a${attempt}.wav`;
      // trim leading/trailing silence, 48 kHz mono
      await run("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", "-ar", "48000", "-ac", "1", out]);
      return out;
    } catch (e) {
      if (tries >= 3) throw e;
      console.log(`chunk ${k + 1}: kie error, retrying (${String(e.stderr || e.message).slice(-120).trim()})`);
    }
  }
}
async function drift(files) {
  try {
    const { stdout } = await run("python", ["-I", path.join(here, "voice-drift.py"), ...files], { maxBuffer: 1 << 24 });
    return JSON.parse(stdout.trim().split("\n").pop());
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout.trim().split("\n").pop()); // exit 1 = drift found
    throw e;
  }
}

const todo = chunks.map((_, k) => k).filter((k) => !ONLY || ONLY.includes(k + 1) || !fs.existsSync(file(k)));
// first pass, 3 calls at a time
const q = todo.slice();
await Promise.all(Array.from({ length: 3 }, async () => {
  while (q.length) { const k = q.shift(); fs.copyFileSync(await tts(k, 1), file(k)); console.log(`chunk ${k + 1}: generated`); }
}));
// check all chunks together (the reference voice is the majority of the whole video); re-do drifted ones
let best = {};
for (let round = 2; round <= 3; round++) {
  const all = chunks.map((_, k) => file(k));
  const r = await drift(all);
  const bad = r.bad.map((f) => all.indexOf(f));
  for (const k of bad) {
    const n = r.windows[file(k)].length;
    if (!best[k] || n < best[k].n) best[k] = { n, src: `.work/vo-chunk-${k + 1}-best.wav` }, fs.copyFileSync(file(k), best[k].src);
  }
  if (!bad.length) { console.log("voice check: no drift"); best = {}; break; }
  console.log(`voice check: drift in chunk ${bad.map((k) => k + 1).join(", ")} -> re-generating`);
  await Promise.all(bad.map(async (k) => fs.copyFileSync(await tts(k, round), file(k))));
}
if (Object.keys(best).length) {
  const r = await drift(chunks.map((_, k) => file(k)));
  if (!r.bad.length) console.log("voice check: no drift (after re-takes)");
  for (const f of r.bad) {
    const k = chunks.findIndex((_, j) => file(j) === f);
    if (best[k] && best[k].n < r.windows[f].length) fs.copyFileSync(best[k].src, f);
    console.log(`WARNING chunk ${k + 1} still drifts after 3 takes (${r.windows[f].map((w) => w.t + "s").join(", ")}) — listen to it, or rewrite its sentences and run --only ${k + 1}`);
  }
}

// join: chunk + 0.6 s pause + chunk ...
const list = [];
await run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "0.6", ".work/pause.wav"]);
chunks.forEach((_, k) => { if (k) list.push("file 'pause.wav'"); list.push(`file '../${file(k)}'`); });
fs.writeFileSync(".work/concat.txt", list.join("\n"));
await run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", ".work/concat.txt", "-c:a", "libmp3lame", "-q:a", "2", "assets/vo/take.mp3"]);
const { stdout: d } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "assets/vo/take.mp3"]);
console.log(`assets/vo/take.mp3 · ${Number(d).toFixed(1)}s · next: python -I <sk>/scripts/words.py .`);

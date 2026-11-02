#!/usr/bin/env node
// Final delivery: (optionally) lay a music bed under the video's own audio, loudness-normalise to -14 LUFS
// (video stream copied), optional re-encode when huge, write a poster frame, and print a one-line spec.
//   node master.mjs <in.mp4> <out.mp4> [posterSecond] [--raw] [--music <file.mp3> [--music-from <s>] [--music-gain <dB>]]
//   --raw          silent product videos without music: keep the quiet UI sounds as they are (no loudness boost)
//   --sfx          .work/sfx.json from compose.mjs (drawing, page turns, year rolls...): mixed under the voice before the music.
//   --music        the channel music bed (brand/music/). Loops with a crossfade when the video is
//                  longer than the rest of the track, fades in/out, and ducks under the voice (sidechain) automatically.
//   --music-from   start offset in the track (vary it per video so viewers don't always hear the same intro). Default 0.
//   --music-gain   dB. Default -7 under a voice-over (after ducking the bed sits ~11 dB under the voice: clearly audible, never fighting it), -3 without voice (--raw).
import { execFileSync, spawnSync } from "node:child_process";
import { statSync, renameSync, unlinkSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const valued = new Set(["--music", "--music-from", "--music-gain", "--sfx"]);
const pos = argv.filter((a, i) => !a.startsWith("--") && !valued.has(argv[i - 1]));
const [inp, out, posterAt] = pos;
const raw = argv.includes("--raw");
const music = opt("--music");
if (!inp || !out) { console.log("usage: node master.mjs <in.mp4> <out.mp4> [posterSecond] [--raw] [--music file --music-from s --music-gain dB]"); process.exit(1); }
if (music && !existsSync(music)) { console.error(`music not found: ${music}`); process.exit(2); }
mkdirSync(dirname(out), { recursive: true });
const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

// sound effects: one track built from the cues (each file is read once and split per cue)
let sfxWav = null;
if (opt("--sfx")) {
  const { cues } = JSON.parse(readFileSync(opt("--sfx"), "utf8"));
  const files = [...new Set(cues.map((c) => c.src))].filter((f) => existsSync(f) || console.error(`sfx missing: ${f}`));
  const flen = Object.fromEntries(files.map((f) => [f, probe(f)]));
  const per = files.map((f) => cues.filter((c) => c.src === f));
  let fc = "";
  const labels = [];
  per.forEach((list, fi) => {
    fc += `[${fi}:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=${list.length}${list.map((_, j) => `[f${fi}_${j}]`).join("")};`;
    list.forEach((c, j) => {
      const d = Math.min(c.dur ?? flen[c.src], 30), fo = Math.min(0.25, d / 3);
      fc += `[f${fi}_${j}]atrim=0:${d.toFixed(3)},asetpts=N/SR/TB,afade=t=in:d=0.03,afade=t=out:st=${(d - fo).toFixed(3)}:d=${fo.toFixed(3)},volume=${c.gain}dB,adelay=${Math.round(c.t * 1000)}:all=1[c${fi}_${j}];`;
      labels.push(`[c${fi}_${j}]`);
    });
  });
  if (labels.length) {
    fc += `${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest[s]`;
    sfxWav = out.replace(/.mp4$/, ".sfx.wav");
    ff([...files.flatMap((f) => ["-stream_loop", "-1", "-i", f]), "-filter_complex", fc, "-map", "[s]", "-t", String(probe(inp) + 0.5), "-ar", "48000", "-ac", "2", sfxWav]);
  }
}
const sfxIn = sfxWav ? ["-i", sfxWav] : [];

if (music) {
  const dur = probe(inp);
  const len = probe(music);
  const from = Math.max(0, Math.min(Number(opt("--music-from") || 0), len - 20));
  const gain = Number(opt("--music-gain") ?? (raw ? -3 : -7));
  const XF = 3, TAIL = 4, LOOP_IN = 8; // crossfade length, skip the track's ending, re-enter after its intro
  // build a bed at least dur+1 s long: [from, len-TAIL] then repeat [LOOP_IN, len-TAIL] with crossfades
  const bed = out.replace(/\.mp4$/, ".bed.wav");
  const segs = [[from, len - TAIL]];
  let total = len - TAIL - from;
  while (total < dur + 1) { segs.push([LOOP_IN, len - TAIL]); total += len - TAIL - LOOP_IN - XF; }
  const ins = segs.flatMap(([a, b]) => ["-ss", String(a), "-t", String(b - a), "-i", music]);
  let fc = "", last = "[0:a]";
  for (let k = 1; k < segs.length; k++) { fc += `${last}[${k}:a]acrossfade=d=${XF}:c1=tri:c2=tri[x${k}];`; last = `[x${k}]`; }
  fc += `${last}atrim=0:${(dur + 0.5).toFixed(2)},asetpts=N/SR/TB[bed]`;
  ff([...ins, "-filter_complex", fc, "-map", "[bed]", "-ar", "48000", "-ac", "2", bed]);
  const mix =
    `[1:a]volume=${gain}dB,afade=t=in:d=0.8,afade=t=out:st=${Math.max(0, dur - 1.8).toFixed(2)}:d=1.8[m];` +
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,${raw ? "anull[v];" : "asplit=2[v][sc];"}` +
    (raw ? `[m]anull[md];` : `[m][sc]sidechaincompress=threshold=0.07:ratio=2.5:attack=20:release=300:makeup=1[md];`) +
    (sfxWav ? `[2:a]anull[s];[v][md][s]amix=inputs=3` : `[v][md]amix=inputs=2`) + `:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`;
  ff(["-i", inp, "-i", bed, ...sfxIn, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]);
  unlinkSync(bed);
} else if (sfxWav) {
  ff(["-i", inp, ...sfxIn, "-filter_complex", `[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[v][1:a]amix=inputs=2:duration=first:normalize=0${raw ? "" : ",loudnorm=I=-14:TP=-1.5:LRA=11"}[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]);
} else {
  ff(["-i", inp, "-c:v", "copy", ...(raw ? [] : ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]), "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]);
}
if (sfxWav) unlinkSync(sfxWav);
const dur = probe(out);
let mb = statSync(out).size / 1e6;
if (mb / dur > 1.6) { // > ~13 Mbps: busy grain/halftone content; re-encode for sharing
  const tmp = out.replace(/\.mp4$/, ".tmp.mp4");
  ff(["-i", out, "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", tmp]);
  unlinkSync(out);
  renameSync(tmp, out);
  mb = statSync(out).size / 1e6;
}
const poster = out.replace(/\.mp4$/, ".jpg");
ff(["-ss", String(posterAt || Math.min(3, dur / 3)), "-i", out, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "3", poster]);
const r = spawnSync("ffmpeg", ["-nostats", "-i", out, "-af", "ebur128", "-f", "null", "-"]).stderr.toString();
const I = (r.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop();
const wh = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=p=0", out]).toString().trim();
console.log(`${out} · ${dur.toFixed(1)}s · ${wh} · ${I} · ${mb.toFixed(1)} MB · poster ${poster}${sfxWav ? " · sfx" : ""}${music ? ` · music ${music.split(/[\\/]/).pop()} from ${opt("--music-from") || 0}s` : ""}`);

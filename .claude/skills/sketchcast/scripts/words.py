"""Split the one-take narration into lines + word timings + pronunciation check.

    python -I words.py <projectDir>

Input: assets/vo/take.mp3 (from vo-take.mjs) and assets/audio.json (the script lines).
faster-whisper (small, vi, word timestamps) transcribes the whole take; the script is aligned to what was
heard, each line is cut at the pause between its last word and the next line's first word
(more reliable than "longest silences", which break on pauses inside a line like "Lý do là: …").
Writes assets/vo/vo-N.mp3 (overwrites) and assets/vo/words.json:
    {"vo-1": {"dur": 3.2, "heard": "...", "words": [[start, end, "word"], ...]}, ...}   (times relative to vo-N)
Prints script vs heard per line; re-run vo-take if a line is misread.
"""
import json, os, re, subprocess, sys, warnings
from difflib import SequenceMatcher

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")
from faster_whisper import WhisperModel  # noqa: E402

proj = sys.argv[1] if len(sys.argv) > 1 else "."
vo_dir = os.path.join(proj, "assets", "vo")
take = os.path.join(vo_dir, "take.mp3")
lines = json.load(open(os.path.join(proj, "assets", "audio.json"), encoding="utf-8"))["lines"]
norm = lambda s: re.sub(r"[^\w]", "", s.lower())
probe = lambda f: float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode().strip())

model = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = model.transcribe(take, language="vi", word_timestamps=True, beam_size=5, vad_filter=False)
heard = [(w.start, w.end, w.word.strip()) for s in segs for w in (s.words or []) if norm(w.word)]
total = probe(take)

# script tokens with their line index
toks = [(li, t) for li, line in enumerate(lines) for t in line.split() if norm(t)]
sm = SequenceMatcher(a=[norm(t) for _, t in toks], b=[norm(w[2]) for w in heard], autojunk=False)
tt = [None] * len(toks)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        tt[a + k] = heard[b + k][:2]
# interpolate unmatched tokens
known = [i for i, x in enumerate(tt) if x]
for i in range(len(tt)):
    if tt[i]:
        continue
    prev = max([k for k in known if k < i], default=None)
    nxt = min([k for k in known if k > i], default=None)
    a = tt[prev][1] if prev is not None else 0.0
    b = tt[nxt][0] if nxt is not None else total
    lo = prev if prev is not None else -1
    hi = nxt if nxt is not None else len(tt)
    step = (b - a) / (hi - lo)
    s = a + step * (i - lo - 1)
    tt[i] = (s, s + step * 0.85)

# line bounds -> cut points in the middle of the inter-line gap
first, last = {}, {}
for (li, _), (s, e) in zip(toks, tt):
    first.setdefault(li, s)
    last[li] = e
cuts = [0.0]
for li in range(len(lines) - 1):
    cuts.append((last[li] + first[li + 1]) / 2)
cuts.append(total)

out, bad = {}, 0
for li, line in enumerate(lines):
    a = max(0.0, min(cuts[li], first[li] - 0.06))
    a = max(a, cuts[li])
    b = cuts[li + 1]
    f = os.path.join(vo_dir, f"vo-{li + 1}.mp3")
    d = b - a
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", take,
                    "-af", f"afade=t=in:d=0.02,afade=t=out:st={max(0, d - 0.06):.3f}:d=0.06", "-c:a", "libmp3lame", "-q:a", "2", f], check=True)
    dur = probe(f)
    # trim leading/trailing silence from the reported timing (audio file keeps the breath)
    words = [[round(s - a, 3), round(e - a, 3), t] for (l, t), (s, e) in zip(toks, tt) if l == li]
    hw = [w for w in heard if a <= (w[0] + w[1]) / 2 < b]
    htxt = " ".join(w[2] for w in hw)
    A, B = [norm(t) for t in line.split() if norm(t)], [norm(w[2]) for w in hw]
    score = SequenceMatcher(a=A, b=B, autojunk=False).ratio() if A else 1
    flag = "" if score >= 0.85 else "   <-- CHECK"
    bad += 1 if flag else 0
    print(f"vo-{li + 1} {dur:.2f}s match {score:.0%}{flag}\n  script: {line}\n  heard:  {htxt}")
    out[f"vo-{li + 1}"] = {"dur": round(dur, 3), "heard": htxt, "words": words}

json.dump(out, open(os.path.join(vo_dir, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"wrote assets/vo/words.json · {len(lines)} lines · lines to check: {bad}")

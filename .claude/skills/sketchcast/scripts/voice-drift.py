"""Find voice drift inside TTS chunks: Gemini TTS can slide into a lower / different-sounding voice for a
few seconds in a long take (user, 2026-10-14: "voice bị hỏng 1 khúc ở giữa"). A per-scene median pitch misses a
5–10 s slip, so this checks every 2.5 s window of speech against the voice of ALL chunks together:
  - pitch: window median F0 outside 0.82–1.25 x the overall median
  - timbre: window MFCC mean far from the overall median (robust z > 3.5)

    python -I voice-drift.py <chunk1> <chunk2> ...      -> prints flags, writes JSON to stdout's last line
Exit 1 when any chunk is flagged.
"""
import sys, json, warnings
import numpy as np
import librosa

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")
files = sys.argv[1:]
WIN, HOP = 2.5, 320
rows = []  # (file, t0, f0_median, mfcc_mean)
for f in files:
    y, sr = librosa.load(f, sr=16000)
    f0, _, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr, frame_length=1024, hop_length=HOP)
    mf = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20, hop_length=HOP)[1:]
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    n = min(len(f0), mf.shape[1], len(rms))
    t = np.arange(n) * HOP / sr
    loud = rms[:n] > np.percentile(rms[:n], 35)
    for s in np.arange(0, max(0.0, t[-1] - 1.0), WIN):
        m = (t >= s) & (t < s + WIN) & loud
        v = f0[:n][m]
        v = v[~np.isnan(v)]
        if m.sum() < 25 or len(v) < 15:
            continue  # mostly pause/breath
        rows.append((f, float(s), float(np.median(v)), mf[:, :n][:, m].mean(1)))

if not rows:
    print(json.dumps({}))
    sys.exit(0)
F0 = np.median([r[2] for r in rows])
X = np.array([r[3] for r in rows])
ref = np.median(X, 0)
mad = np.median(np.abs(X - ref), 0) * 1.4826 + 1e-6
dist = np.array([np.sqrt(np.mean(((x - ref) / mad) ** 2)) for x in X])
dmed = np.median(dist)
dmad = np.median(np.abs(dist - dmed)) * 1.4826 + 1e-6
res = {f: [] for f in files}
for (f, s, f0m, _), d in zip(rows, dist):
    why = []
    if f0m < 0.82 * F0 or f0m > 1.25 * F0:
        why.append(f"pitch {f0m:.0f}Hz vs {F0:.0f}")
    if (d - dmed) / dmad > 3.5:
        why.append(f"timbre z {(d - dmed) / dmad:.1f}")
    if why:
        res[f].append({"t": round(s, 1), "why": ", ".join(why)})
# A clear pitch drop/jump is drift even in one window (the 2026-10-14 glitch was a single ~3 s slip at 176 Hz vs
# 217 Hz). Timbre alone is noisier (laughs, breaths): needs two windows.
bad = {f: w for f, w in res.items() if any("pitch" in x["why"] for x in w) or len(w) >= 2}
for f in files:
    w = res[f]
    print(f"{f}: {'DRIFT ' if f in bad else 'ok    '}" + "; ".join(f"{x['t']}s {x['why']}" for x in w))
print(json.dumps({"median_f0": round(float(F0)), "bad": list(bad), "windows": res}))
sys.exit(1 if bad else 0)

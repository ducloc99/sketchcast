#!/usr/bin/env node
// Sum kie.ai credits for this project: .work/costs.jsonl (images, via kie.mjs) + the voice takes' "credits" in .work/vo.log.
// Usage (from the project dir): node <skill>/scripts/cost.mjs [usdPer1000Credits=5]
import fs from "node:fs";
const rate = Number(process.argv[2] || 5) / 1000;
const rows = fs.existsSync(".work/costs.jsonl") ? fs.readFileSync(".work/costs.jsonl", "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const byModel = {};
for (const r of rows) byModel[r.model] = (byModel[r.model] || 0) + (Number(r.credits) || 0);
const voice = fs.existsSync(".work/vo.log") ? [...fs.readFileSync(".work/vo.log", "utf8").matchAll(/"credits":([\d.]+)/g)].reduce((a, m) => a + Number(m[1]), 0) : 0;
if (voice) byModel["voice (Gemini TTS, vo-take)"] = voice;
const total = Object.values(byModel).reduce((a, b) => a + b, 0);
for (const [m, c] of Object.entries(byModel)) console.log(`${c.toFixed(1).padStart(8)} cr  ${m}`);
console.log(`${total.toFixed(1).padStart(8)} cr  TOTAL  ≈ $${(total * rate).toFixed(2)} (at $${(rate * 1000).toFixed(2)}/1000 cr)`);

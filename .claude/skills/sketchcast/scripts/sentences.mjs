#!/usr/bin/env node
// Print every scene's sentences with their index and spoken start time (after the voice is aligned),
// so regions.json "at": [sentenceIndex, offset] can be written against the real narration.
import fs from "node:fs";
const script = JSON.parse(fs.readFileSync("script.json", "utf8"));
const words = JSON.parse(fs.readFileSync("assets/vo/words.json", "utf8"));
const toks = (l) => l.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
script.scenes.forEach((sc, i) => {
  const vo = words[`vo-${i + 1}`];
  console.log(`\n${sc.id}  (${vo.dur.toFixed(1)}s)`);
  let k = 0;
  sc.text.split(/(?<=[.?!])\s+/).forEach((s, si) => {
    console.log(`  [${si}] ${vo.words[Math.min(k, vo.words.length - 1)][0].toFixed(1)}s  ${s}`);
    k += toks(s).length;
  });
});

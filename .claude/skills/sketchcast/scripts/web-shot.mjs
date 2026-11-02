#!/usr/bin/env node
// Screenshot real web pages (official posts, help pages, news) for WB videos.
// Uses the puppeteer-core + chrome-headless-shell that HyperFrames installs (system headless Chrome often crashes).
//
//   node web-shot.mjs <outDir> <W>x<H> name=url [name=url …] [--mobile] [--at "text"] [--vi map.json]
//
//   --mobile      phone rendering (isMobile, scale 2.62): W should be ~412. The shot is W×H CSS px → about 1079×(H·2.62),
//                 e.g. 412x732 → a 9:16 frame. Without --mobile: desktop viewport, scale 2.
//   --at "text"   start the shot ~150 px above the first element containing this text (default: top of the page).
//   --vi map.json translate in place before the shot, like the browser's translate:
//                 [{"en": "exact English text on the page", "vi": "bản dịch tiếng Việt sát nghĩa"}, …].
//                 Replaces text nodes and whole elements whose text matches. Keep numbers, dates and names exact.
//                 Titles split into per-letter spans (animated headings) need {"selector": "h1", "vi": "…"} instead.
//                 If the site font drops Vietnamese marks (ọ, ậ, ữ…), add "font": "'Segoe UI', Arial, sans-serif" to that entry
//                 and look at the shot: every diacritic must be there.
// Cookie banners are declined (privacy-first) before the shot.
import { readdirSync, existsSync, statSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const mobile = argv.includes("--mobile");
const atText = opt("--at");
const viMap = opt("--vi") ? JSON.parse(readFileSync(opt("--vi"), "utf8")) : [];
const pos = argv.filter((a, i) => !a.startsWith("--") && !["--at", "--vi"].includes(argv[i - 1]));
const [outDir, size, ...pairs] = pos;
if (!outDir || !size || !pairs.length) { console.log("usage: node web-shot.mjs <outDir> 412x732 name=url … [--mobile] [--at text] [--vi map.json]"); process.exit(1); }
const [W, H] = size.split("x").map(Number);
const npx = join(homedir(), "AppData", "Local", "npm-cache", "_npx");
const pp = readdirSync(npx).map((d) => join(npx, d, "node_modules", "puppeteer-core")).filter(existsSync)
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!pp) { console.error("puppeteer-core not found — run any `npx hyperframes` command once"); process.exit(2); }
const chromeRoot = join(homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
const ver = readdirSync(chromeRoot).sort().at(-1);
const exe = join(chromeRoot, ver, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
const puppeteer = (await import(pathToFileURL(join(pp, "lib", "puppeteer", "puppeteer-core.js")).href)).default;
mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--hide-scrollbars"] });
for (const p of pairs) {
  const [name, ...u] = p.split("="); const url = u.join("=");
  const page = await browser.newPage();
  if (mobile) {
    await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36");
    await page.setViewport({ width: W, height: 915, deviceScaleFactor: 2.62, isMobile: true, hasTouch: true });
  } else {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36");
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  }
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 3000));
    await page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (/^(reject|reject all|reject non-essential|decline|decline all|no thanks|recusar|từ chối)$/i.test(b.textContent.trim())) b.click(); });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await new Promise((r) => setTimeout(r, 1200));
    let y0 = 0;
    if (atText) {
      y0 = await page.evaluate((t) => {
        const els = [...document.querySelectorAll("body *")].filter((e) => e.children.length < 3 && e.textContent.includes(t) && e.getBoundingClientRect().height > 0);
        const e = els.sort((a, b) => a.textContent.length - b.textContent.length)[0];
        return e ? Math.max(0, e.getBoundingClientRect().y + scrollY - 150) : 0;
      }, atText);
    }
    if (viMap.length) {
      const n = await page.evaluate((map) => {
        let count = 0;
        const norm = (s) => s.replace(/\s+/g, " ").trim();
        for (const { en, vi, selector, font } of map) {
          const setFont = (el) => { if (font && el) el.style.fontFamily = font; };
          if (selector) { const el = document.querySelector(selector); if (el) { el.textContent = vi; setFont(el); count++; } continue; }
          const hits = [...document.querySelectorAll("body *")].filter((el) => norm(el.textContent) === norm(en));
          // deepest matching elements only (the one that actually holds the words, even when split into spans)
          for (const el of hits.filter((el) => !hits.some((o) => o !== el && el.contains(o)))) { el.textContent = vi; setFont(el); count++; }
          const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let t = tw.nextNode(); t; t = tw.nextNode()) if (t.nodeValue.includes(en)) { t.nodeValue = t.nodeValue.split(en).join(vi); setFont(t.parentElement); count++; }
        }
        return count;
      }, viMap);
      console.log(`  translated ${n} place(s)`);
      await new Promise((r) => setTimeout(r, 800));
    }
    await page.screenshot({ path: join(outDir, `${name}.png`), clip: { x: 0, y: y0, width: W, height: H }, captureBeyondViewport: true });
    console.log("ok  ", name, url, atText ? `(the --at text sits ~${(150 / H).toFixed(2)} down the shot)` : "");
  } catch (e) { console.log("FAIL", name, e.message); }
  await page.close();
}
await browser.close();

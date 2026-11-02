// kie.ai Market client: create a task, poll recordInfo, download result files.
// Usage: node kie.mjs <request.json> <outPrefix>
//   request.json = { "model": "...", "input": { ... } }
//   writes <outPrefix>-1.<ext>, <outPrefix>-2.<ext>, ... and prints
//   {"taskId","credits","costTime","files":[...],"urls":[...]} on stdout.
// The key comes from $KIE_API_KEY or the nearest .env (cwd and its parents) with KIE_API_KEY=...
import fs from "node:fs";
import path from "node:path";

function findKey() {
  if (process.env.KIE_API_KEY) return process.env.KIE_API_KEY.trim();
  let dir = process.cwd();
  for (;;) {
    const f = path.join(dir, ".env");
    if (fs.existsSync(f)) {
      const m = fs.readFileSync(f, "utf8").match(/^KIE_API_KEY=(.+)$/m);
      if (m) return m[1].trim();
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error("KIE_API_KEY not found (set env var or add it to .env)");
}

const KEY = findKey();
const API = "https://api.kie.ai/api/v1/jobs";
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createTask(body) {
  const json = await (await fetch(`${API}/createTask`, { method: "POST", headers, body: JSON.stringify(body) })).json();
  // kie answers HTTP 200 even on errors: the real status is json.code
  if (json.code !== 200) throw new Error(`createTask failed: ${json.code} ${json.msg}`);
  return json.data.taskId;
}

async function waitTask(taskId, timeoutMs = 15 * 60 * 1000) {
  const t0 = Date.now();
  let last = "";
  for (let i = 0; Date.now() - t0 < timeoutMs; i++) {
    const json = await (await fetch(`${API}/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers })).json();
    if (json.code === 422 && i < 10) { await sleep(3000); continue; } // record not visible yet
    if (json.code !== 200) throw new Error(`recordInfo failed: ${json.code} ${json.msg}`);
    const d = json.data;
    if (d.state !== last) { console.error(`[${taskId}] ${d.state}`); last = d.state; }
    if (d.state === "success") return d;
    if (d.state === "fail") throw new Error(`task failed: ${d.failCode} ${d.failMsg}`);
    await sleep(5000);
  }
  throw new Error("timeout waiting for task");
}

// Suno tracks live under data.response.data[]; Market models use resultJson.resultUrls.
function resultUrls(d) {
  const tracks = d.response?.data;
  if (Array.isArray(tracks) && tracks.length) return tracks.map((t) => t.audio_url).filter(Boolean);
  const rj = typeof d.resultJson === "string" && d.resultJson ? JSON.parse(d.resultJson) : d.resultJson;
  return rj?.resultUrls ?? [];
}

const [reqFile, outPrefix] = process.argv.slice(2);
if (!reqFile || !outPrefix) {
  console.error("usage: node kie.mjs <request.json> <outPrefix>");
  process.exit(2);
}
const body = JSON.parse(fs.readFileSync(reqFile, "utf8"));
const taskId = await createTask(body);
console.error(`taskId=${taskId}`);
const d = await waitTask(taskId);
const urls = resultUrls(d);
if (!urls.length) throw new Error(`no result urls: ${JSON.stringify(d).slice(0, 800)}`);
fs.mkdirSync(path.dirname(path.resolve(outPrefix)), { recursive: true });
const files = [];
for (const [i, url] of urls.entries()) {
  const ext = (new URL(url).pathname.match(/\.(\w+)$/)?.[1] ?? "bin").toLowerCase();
  const file = `${outPrefix}-${i + 1}.${ext}`;
  fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
  files.push(file);
}
// Suno track ids (needed for timestamped lyrics) are printed too.
const trackIds = (d.response?.data ?? []).map((t) => t.id).filter(Boolean);
// Cost log: every finished job is appended to <cwd>/.work/costs.jsonl (read by cost.mjs).
try {
  fs.mkdirSync(".work", { recursive: true });
  fs.appendFileSync(".work/costs.jsonl", JSON.stringify({ at: new Date().toISOString(), model: body.model, out: outPrefix, taskId, credits: d.creditsConsumed ?? null }) + "\n");
} catch {}
console.log(JSON.stringify({ taskId, credits: d.creditsConsumed, costTime: d.costTime, files, urls, ...(trackIds.length ? { trackIds } : {}) }));

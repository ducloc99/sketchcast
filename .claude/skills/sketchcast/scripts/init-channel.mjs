#!/usr/bin/env node
// One-time setup of a channel folder (the folder Claude Code is opened in): copies the skill's channel look to
// brand/ (style.json + sound set), writes kenh.md (who the channel talks to, how videos end, hashtags) for the user
// to fill in, a .env line for the kie.ai key, a .gitignore, and installs the scripts' packages once.
// Never overwrites what is already there.
// Usage (channel folder): node <sk>/scripts/init-channel.mjs
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SKILL_BRAND } from "./brand.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const done = [];
const write = (f, text) => { if (fs.existsSync(f)) return; fs.writeFileSync(f, text); done.push(f); };

if (!fs.existsSync("brand/style.json")) {
  fs.cpSync(SKILL_BRAND, "brand", { recursive: true });
  fs.mkdirSync("brand/music", { recursive: true });
  done.push("brand/ (style.json, sfx/, music/)");
}
fs.mkdirSync("videos", { recursive: true });
write("kenh.md", `# Kênh

- Tên kênh:
- Nói chuyện với ai (tuổi, nghề, đang lo gì):
- Lời hứa của kênh (xem kênh được gì):
- Đăng ở đâu: YouTube / Facebook / TikTok
- Giọng kể: bình tĩnh, như người bạn hiểu chuyện kể lại
- Cách kết mỗi video (một câu hỏi về người xem + một lời mời theo dõi):
- Hashtag cố định: #TenKenh

## Đã làm
| Ngày | Chủ đề | Thư mục | Trạng thái |
|---|---|---|---|
`);
write(".env", "KIE_API_KEY=\n");
write(".gitignore", ".env\nnode_modules/\nvideos/*/renders/\nvideos/*/.work/\n");
if (!fs.existsSync(path.join(here, "node_modules"))) {
  execSync("npm install --no-audit --no-fund --silent", { cwd: here, stdio: "inherit" });
  done.push("scripts/node_modules");
}
console.log(done.length ? `created: ${done.join(", ")}` : "channel already set up");
const key = fs.readFileSync(".env", "utf8").match(/^KIE_API_KEY=(.+)$/m);
if (!key && !process.env.KIE_API_KEY) console.log("next: put your kie.ai key in .env (KIE_API_KEY=...)");

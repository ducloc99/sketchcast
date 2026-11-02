// Where the channel look lives: the nearest brand/style.json from the current folder up (the channel folder,
// e.g. <channel>/brand when running from <channel>/videos/<dir>), else the template that ships with the skill.
// The skill may sit in <channel>/.claude/skills/ or in Claude Code's plugin cache, so never resolve from the script.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const SKILL_BRAND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../brand");
export function channelBrand(from = process.cwd()) {
  for (let d = path.resolve(from); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "brand", "style.json"))) return path.join(d, "brand");
    if (path.dirname(d) === d) return null;
  }
}
export const BRAND = channelBrand() || SKILL_BRAND;

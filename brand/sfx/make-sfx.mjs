#!/usr/bin/env node
// Bộ âm thanh hiệu ứng của kênh, tạo hoàn toàn bằng code (không tải về, không tốn credit, không lo bản quyền).
// Chạy lại sẽ ra đúng các file như cũ (ngẫu nhiên có hạt giống cố định).
//   node make-sfx.mjs          -> <tên>.mp3 trong thư mục này cho mọi hiệu ứng trong danh sách SFX bên dưới
// scribble, tick, rewind không tạo ở đây (xem assets/CREDITS.md của skill).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const TAU = Math.PI * 2;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

const buf = (sec) => new Float32Array(Math.round(sec * SR));
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d)); // vào nhanh, tắt dần
function biquad(x, type, f, q = 0.7) {
  // bộ lọc một tầng (RBJ), f có thể là hàm theo thời gian để quét tần số
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = typeof f === "function" ? f(i / SR) : f;
    const w = (TAU * fc) / SR, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
    else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; } // bp
    const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    y[i] = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y[i];
  }
  return y;
}
const noise = (sec) => buf(sec).map(() => rnd());
const mix = (into, src, at = 0, g = 1) => { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < into.length; i++) into[o + i] += src[i] * g; return into; };
// âm có cao độ: freq là số hoặc hàm theo thời gian, partials = [[bội số, biên độ], ...]
function tone(sec, freq, partials = [[1, 1]], a = 0.005, d = 0.3) {
  const x = buf(sec), ph = partials.map(() => 0);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, f = typeof freq === "function" ? freq(t) : freq;
    let s = 0;
    partials.forEach(([m, amp], k) => { ph[k] += (TAU * f * m) / SR; s += Math.sin(ph[k]) * amp; });
    x[i] = s * env(t, a, d);
  }
  return x;
}
function pluck(sec, f, bright = 0.5) {
  // dây gảy (Karplus-Strong)
  const n = Math.round(SR / f), line = new Float32Array(n).map(() => rnd()), x = buf(sec);
  for (let i = 0; i < x.length; i++) {
    const j = i % n, v = line[j];
    line[j] = (v + line[(j + 1) % n]) * 0.5 * (0.996 + bright * 0.003);
    x[i] = v;
  }
  return biquad(x, "lp", 5000);
}
const shape = (x, fn) => x.map((v, i) => v * fn(i / SR));
const fadeOut = (x, sec = 0.02) => shape(x, (t) => Math.min(1, (x.length / SR - t) / sec));

// ---------- danh sách hiệu ứng ----------
// mỗi mục: [mô tả tiếng Việt để ghi vào danh mục, hàm tạo âm]
export const SFX = {
  stamp: ["Con dấu đập xuống trang (NÓI QUÁ, ĐÚNG MỘT NỬA...)", () => {
    const x = tone(0.5, (t) => 95 * Math.exp(-t * 6) + 48, [[1, 1], [2, 0.25]], 0.002, 0.12);
    mix(x, shape(biquad(noise(0.06), "bp", 1800, 1.2), (t) => env(t, 0.001, 0.012)), 0, 1.4);
    mix(x, tone(0.12, 420, [[1, 1], [2.3, 0.4]], 0.001, 0.03), 0.004, 0.35);
    return x;
  }],
  ding: ["Đúng / ý chính hiện ra: tiếng chuông nhỏ", () =>
    tone(1.6, 1318.5, [[1, 1], [2.76, 0.35], [5.4, 0.12], [0.5, 0.15]], 0.002, 0.42)],
  sparkle: ["Con số hoặc chữ quan trọng hiện lên: lấp lánh", () => {
    const x = buf(1.1);
    [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, k) => mix(x, tone(0.6, f, [[1, 1], [3, 0.15]], 0.002, 0.12), k * 0.055, 0.5));
    mix(x, shape(biquad(noise(1.1), "hp", 7000), (t) => env(t, 0.05, 0.25)), 0, 0.12);
    return x;
  }],
  wrong: ["Sai / tin không đúng: hai nốt đi xuống nhẹ nhàng", () => {
    const x = buf(0.9), p = [[1, 1], [2, 0.3], [3, 0.12]];
    mix(x, tone(0.4, 330, p, 0.01, 0.16), 0, 0.8);
    mix(x, tone(0.6, (t) => 262 * (1 - 0.02 * Math.sin(t * 30)), p, 0.01, 0.24), 0.22, 0.8);
    return biquad(x, "lp", 2400);
  }],
  boing: ["Nhân vật nhảy vào khung hình", () =>
    tone(0.7, (t) => 180 + 320 * (1 - Math.exp(-t * 9)) + 40 * Math.sin(t * 38) * Math.exp(-t * 5), [[1, 1], [2, 0.2]], 0.004, 0.22)],
  riser: ["Dồn lên trước khi lật đáp án (1,6 giây)", () => {
    const L = 1.6, x = shape(biquad(noise(L), "bp", (t) => 400 + 3600 * (t / L) ** 2, 2.5), (t) => (t / L) ** 2 * 0.9);
    mix(x, shape(tone(L, (t) => 220 + 440 * (t / L), [[1, 1]], 0.01, 99), (t) => (t / L) ** 3 * 0.35));
    return fadeOut(x, 0.03);
  }],
  paper: ["Lật một tờ giấy / lật thẻ", () => {
    const x = buf(0.5);
    for (const [at, d, f] of [[0, 0.09, 3200], [0.07, 0.14, 2200], [0.19, 0.06, 4200]])
      mix(x, shape(biquad(noise(d + 0.05), "bp", f, 0.9), (t) => env(t, 0.01, d / 3) * (1 + 0.6 * Math.sin(t * 900))), at, 0.9);
    return x;
  }],
  marker: ["Bút dạ khoanh tròn / gạch chân (0,7 giây)", () => {
    const L = 0.7, x = shape(biquad(noise(L), "bp", (t) => 2600 + 700 * Math.sin(t * 22), 3), (t) => Math.sin(Math.PI * Math.min(1, t / L)) * (0.75 + 0.25 * Math.sin(t * 60)));
    mix(x, shape(tone(L, (t) => 1500 + 300 * Math.sin(t * 22), [[1, 1]], 0.05, 99), (t) => 0.05 * Math.sin(Math.PI * Math.min(1, t / L))));
    return x;
  }],
  coin: ["Tiền, giá cả, lương", () => {
    const x = buf(0.8), p = [[1, 1], [3, 0.2], [5, 0.08]];
    mix(x, tone(0.12, 987.8, p, 0.001, 0.05), 0, 0.6);
    mix(x, tone(0.7, 1318.5, p, 0.001, 0.22), 0.07, 0.6);
    return x;
  }],
  typing: ["Gõ phím (1,2 giây): chủ đề máy tính, AI", () => {
    const x = buf(1.25);
    let t = 0.02;
    while (t < 1.15) {
      mix(x, shape(biquad(noise(0.03), "bp", 2500 + rnd() * 1200, 1.5), (u) => env(u, 0.0005, 0.006)), t, 0.8 + rnd() * 0.2);
      mix(x, tone(0.03, 140 + rnd() * 30, [[1, 1]], 0.0005, 0.008), t, 0.25);
      t += 0.07 + Math.abs(rnd()) * 0.09;
    }
    return x;
  }],
  shutter: ["Chụp lại bằng chứng (máy ảnh)", () => {
    const x = buf(0.45), click = (g) => shape(biquad(noise(0.04), "bp", 3000, 1), (t) => env(t, 0.0005, 0.008) * g);
    mix(x, click(1), 0); mix(x, shape(biquad(noise(0.12), "bp", (t) => 1500 + 9000 * t, 1), (t) => env(t, 0.005, 0.03) * 0.3), 0.02); mix(x, click(0.8), 0.13);
    return x;
  }],
  zoom: ["Kính lúp phóng to / máy quay đẩy vào", () => {
    const L = 0.45;
    return fadeOut(shape(biquad(noise(L), "bp", (t) => 300 * Math.pow(20, t / L), 1.8), (t) => Math.sin(Math.PI * (t / L)) ** 1.5), 0.02);
  }],
  tada: ["Chốt lại, kết luận: gảy đàn hợp âm trưởng", () => {
    const x = buf(1.8);
    [261.6, 329.6, 392, 523.3].forEach((f, k) => mix(x, pluck(1.7, f, 0.6), k * 0.045, 0.45));
    mix(x, tone(1.4, 1046.5, [[1, 1]], 0.01, 0.35), 0.16, 0.08);
    return fadeOut(x, 0.1);
  }],
  whoosh: ["Lật sang trang mới: gió lướt qua (0,6 giây)", () => {
    const L = 0.6;
    return fadeOut(shape(biquad(noise(L), "bp", (t) => 500 + 2500 * Math.sin(Math.PI * (t / L)), 1.2), (t) => Math.sin(Math.PI * (t / L)) ** 2), 0.03);
  }],
  pop: ["Đồ vật hoặc ảnh bật ra", () => {
    const x = tone(0.25, (t) => 260 + 700 * (1 - Math.exp(-t * 40)), [[1, 1], [2, 0.15]], 0.002, 0.05);
    mix(x, shape(biquad(noise(0.03), "bp", 2200, 1.5), (t) => env(t, 0.0005, 0.006)), 0, 0.5);
    return x;
  }],
};

// ---------- ghi file ----------
function wav(x) {
  let peak = 1e-9;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const g = 0.708 / peak; // đỉnh -3 dBFS
  const b = Buffer.alloc(44 + x.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * g * 32767))), 44 + i * 2));
  return b;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [key, [, make]] of Object.entries(SFX)) {
    const tmp = path.join(OUT, `${key}.wav`);
    fs.writeFileSync(tmp, wav(make()));
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-ac", "2", "-b:a", "192k", path.join(OUT, `${key}.mp3`)]);
    fs.unlinkSync(tmp);
    console.log(`ok ${key}.mp3`);
  }
}

/**
 * Проходит страницу экран за экраном и снимает каждый — так видно то же,
 * что видит человек (липкие блоки, проявление, ленивые картинки).
 * Полностраничный снимок для страницы длиной 30 000 px Chromium рендерит
 * с пропусками, поэтому для проверки вёрстки используем обход.
 *
 *   node scripts/walk.mjs [url] [ширина] [высота] [папка]
 */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const URL = process.argv[2] ?? 'http://localhost:4321/China2027/';
const W = Number(process.argv[3] ?? 1440);
const H = Number(process.argv[4] ?? 900);
const OUT = process.argv[5] ?? `.tmp/walk-${W}`;
const mobile = W < 700;

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
await page.goto(URL, { waitUntil: 'networkidle' });
const total = await page.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
const shots = [];
for (let y = 0; y < total; y += Math.round(H * 0.9)) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(700);
  await page.evaluate(async () => {
    const imgs = [...document.images].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && !img.complete;
    });
    await Promise.all(imgs.map((img) => new Promise((res) => { img.onload = img.onerror = res; setTimeout(res, 3000); })));
  });
  await page.waitForTimeout(500);
  const file = `${OUT}/${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  shots.push(file);
  i++;
}
// Склейка по три экрана в ряд — чтобы просматривать быстрее.
const per = mobile ? 4 : 2;
for (let k = 0; k < shots.length; k += per) {
  const group = shots.slice(k, k + per);
  const scale = mobile ? 0.8 : 0.62;
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const tiles = await Promise.all(group.map((f) => sharp(f).resize(w, h).toBuffer()));
  await sharp({ create: { width: (w + 8) * group.length, height: h, channels: 3, background: '#777' } })
    .composite(tiles.map((b, j) => ({ input: b, left: j * (w + 8), top: 0 })))
    .jpeg({ quality: 72 })
    .toFile(`${OUT}/sheet-${String(k / per).padStart(2, '0')}.jpg`);
}
console.log(`${shots.length} экранов, высота страницы ${total}px -> ${OUT}`);
await browser.close();

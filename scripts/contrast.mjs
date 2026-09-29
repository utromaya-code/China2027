/**
 * Замер контраста текста, лежащего на фотографиях, по пикселям под глифами.
 * Снимает экран с текстом и без него (color: transparent), берёт самые
 * светлые пиксели фона в прямоугольнике текста (95-й перцентиль) и считает
 * контраст WCAG с цветом текста.
 *
 *   node scripts/contrast.mjs [url]
 */
import { chromium } from 'playwright';
import sharp from 'sharp';

const URL = process.argv[2] ?? 'http://localhost:4321/China2027/';
const CHECKS = [
  { sel: '.hero__kicker', min: 4.5 },
  { sel: '.hero__title', min: 3 },
  { sel: '.hero__lead', min: 4.5 },
  { sel: '.hero__facts', min: 4.5 },
  { sel: '.hero__moon > span:last-child', min: 4.5 },
  { sel: '.site-nav', min: 4.5 },
];
const VIEWPORTS = [
  { w: 375, h: 812, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 768, h: 1024, mobile: false },
  { w: 1440, h: 900, mobile: false },
];

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let failures = 0;
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200); // анимации первого экрана
  for (const c of CHECKS) {
    // Прямоугольники строк текста, а не всего блока: блок занимает всю ширину
    // колонки, а текст — только её часть.
    const found = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || getComputedStyle(el).display === 'none') return null;
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()]
        .filter((r) => r.width > 2 && r.height > 2)
        .map((r) => ({ x: Math.max(0, r.x), y: Math.max(0, r.y), w: Math.min(r.width, innerWidth - Math.max(0, r.x)), h: Math.min(r.height, innerHeight - Math.max(0, r.y)) }))
        .filter((r) => r.w > 2 && r.h > 2);
      const color = getComputedStyle(el).color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      return { rects, color };
    }, c.sel);
    if (!found || !found.rects.length) continue;
    await page.addStyleTag({ content: `${c.sel}, ${c.sel} * { color: transparent !important; }` });
    let r = Infinity;
    for (const box of found.rects) {
      const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
      const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const lums = [];
      for (let i = 0; i < data.length; i += info.channels) lums.push(lum([data[i], data[i + 1], data[i + 2]]));
      lums.sort((a, b) => a - b);
      const bg = lums[Math.floor(lums.length * 0.95)];
      r = Math.min(r, ratio(lum(found.color), bg));
    }
    await page.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent.includes('transparent !important') && s.remove()));
    const ok = r >= c.min;
    if (!ok) failures++;
    console.log(`${vp.w}px ${c.sel.padEnd(14)} ${r.toFixed(2)}:1 ${ok ? 'ok' : `< ${c.min} ✗`}`);
  }
  await page.close();
}
await browser.close();
process.exit(failures ? 1 : 0);

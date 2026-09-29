/**
 * Скачивает отобранные кадры и записывает данные об авторстве.
 *
 *   node scripts/fetch_selected.mjs
 *
 * Выбор — в picks.json: { "<ключ>": { "src": "commons|openverse", "slug": "...", "index": 3 } }.
 * Кадры кладутся в src/assets/photos/<ключ>.jpg, автор, лицензия и ссылка
 * на оригинал — в src/data/credits.json.
 *
 * Скрипт ничего не выбирает сам: без записи в picks.json кадр на сайт не попадёт.
 * Уже скачанные файлы не перекачиваются.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = 'src/assets/photos';
const CREDITS = 'src/data/credits.json';
const MAX_WIDTH = 2400;
const UA = 'china2027-landing/1.0 (travel landing page; image sourcing)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Оригиналы на Commons бывают по 100+ МБ (панорамы на 20 000 px), поэтому
 * для Wikimedia берём готовую уменьшенную копию нужной ширины, а не оригинал.
 */
function downloadUrl(row) {
  const url = row.url || '';
  const m = url.match(/upload\.wikimedia\.org\/wikipedia\/commons\/(\w)\/(\w\w)\/([^?]+)/);
  if (!m) return url;
  // Оригиналы Commons отдаёт с паузой до 10 минут (429), а уменьшенные копии
  // стандартных ширин (1280, 1920, 3840) — сразу. Берём копию, а не оригинал.
  const [, a, ab, name] = m;
  const width = row.width ?? 0;
  const step = width > 1920 ? 1920 : width > 1280 ? 1280 : 0;
  if (!step) return url;
  const suffix = /\.(tif|tiff)$/i.test(name) ? '.jpg' : '';
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${name}/${step}px-${name}${suffix}`;
}

async function fetchBuffer(url, attempt = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(180_000) });
  if (res.status === 429 && attempt < 4) {
    const retryAfter = Math.min(Number(res.headers.get('retry-after')) || 2, 90);
    console.warn(`  429, пауза ${retryAfter}s`);
    await sleep(retryAfter * 1000 + 400);
    return fetchBuffer(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const sources = {
  commons: JSON.parse(await fs.readFile('commons.json', 'utf8')),
  openverse: JSON.parse(await fs.readFile('openverse.json', 'utf8')),
};
const picks = JSON.parse(await fs.readFile('picks.json', 'utf8'));
await fs.mkdir(OUT_DIR, { recursive: true });

let credits = {};
try {
  credits = JSON.parse(await fs.readFile(CREDITS, 'utf8'));
} catch {
  credits = {};
}

for (const [key, pick] of Object.entries(picks)) {
  if (key.startsWith('_')) continue;
  const row = sources[pick.src]?.[pick.slug]?.[pick.index];
  if (!row) {
    console.error(`! ${key}: нет кандидата ${pick.src}/${pick.slug}[${pick.index}]`);
    continue;
  }
  const dest = path.join(OUT_DIR, `${key}.jpg`);
  try {
    await fs.access(dest);
    console.log(`= ${key}`);
  } catch {
    try {
      const buf = await fetchBuffer(downloadUrl(row));
      await sharp(buf)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(dest);
      const { size } = await fs.stat(dest);
      console.log(`+ ${key}: ${(size / 1024).toFixed(0)} KB`);
      await sleep(600);
    } catch (err) {
      console.error(`! ${key}: ${err.message}`);
      continue;
    }
  }
  credits[key] = {
    title: String(row.title || '').replace(/^File:/, '').replace(/<[^>]+>/g, '').trim() || null,
    author: row.creator || 'не указан',
    license: row.license,
    licenseUrl: row.license_url ?? null,
    source: row.source,
    originalUrl: row.descriptionurl ?? row.url,
  };
}

const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(CREDITS, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.log(`\n${Object.keys(sorted).length} записей об авторстве -> ${CREDITS}`);

/**
 * Контактные листы: сетка пронумерованных превью кандидатов, чтобы выбирать
 * кадры глазами, а не по названию файла.
 *
 *   node scripts/contact_sheets.mjs <commons|openverse> [рубрика ...]
 *
 * Результат: .tmp/sheets/<источник>-<рубрика>.jpg
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [source = 'openverse', ...only] = process.argv.slice(2);
const CANDIDATES = `${source}.json`;
const OUT_DIR = '.tmp/sheets';
const COLS = 4;
const CELL_W = 320;
const CELL_H = 214;
const PAD = 6;
const MAX_PER_SHEET = 24;
const UA = 'china2027-landing/1.0 (travel landing page; image sourcing)';

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Маленькое превью: у Flickr — размер _n того же снимка, у Commons — thumb 500px. */
export function previewUrl(row) {
  const url = row.url || '';
  if (url.includes('staticflickr.com')) return url.replace(/_[a-z]\.jpg$/, '_n.jpg');
  if (row.thumb && !row.thumb.includes('api.openverse.org')) return row.thumb;
  const m = url.match(/upload\.wikimedia\.org\/wikipedia\/commons\/(\w)\/(\w\w)\/([^?]+)/);
  if (m) {
    const [, a, ab, name] = m;
    const suffix = /\.(tif|tiff)$/i.test(name) ? '.jpg' : '';
    return `https://thumb.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${name}/500px-${name}${suffix}`;
  }
  return row.thumb || url;
}

async function fetchBuffer(url, attempt = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60_000) });
  if (res.status === 429 && attempt < 6) {
    const retryAfter = Number(res.headers.get('retry-after')) || 2;
    await sleep(retryAfter * 1000 + 300);
    return fetchBuffer(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function makeCell(row, index) {
  const buf = await fetchBuffer(previewUrl(row));
  const img = await sharp(buf).resize(CELL_W, CELL_H, { fit: 'cover', position: 'attention' }).toBuffer();
  const title = String(row.title || '').replace(/^File:/, '').slice(0, 44);
  const label = Buffer.from(
    `<svg width="${CELL_W}" height="${CELL_H}" xmlns="http://www.w3.org/2000/svg">
       <rect x="0" y="0" width="40" height="28" fill="#000" opacity="0.8"/>
       <text x="6" y="20" font-family="monospace" font-size="17" fill="#ff5">${index}</text>
       <rect x="0" y="${CELL_H - 34}" width="${CELL_W}" height="34" fill="#000" opacity="0.62"/>
       <text x="5" y="${CELL_H - 20}" font-family="monospace" font-size="11" fill="#fff">${escapeXml(title)}</text>
       <text x="5" y="${CELL_H - 6}" font-family="monospace" font-size="11" fill="#9f9">${escapeXml(
         `${row.width ?? '?'}x${row.height ?? '?'} ${String(row.license || '').slice(0, 16)} ${row.source === 'Flickr' ? 'FL' : 'WM'}`,
       )}</text>
     </svg>`,
  );
  return sharp(img).composite([{ input: label, top: 0, left: 0 }]).toBuffer();
}

async function buildSheet(slug, rows) {
  const picked = rows.slice(0, MAX_PER_SHEET);
  const cells = await Promise.all(
    picked.map(async (row, i) => {
      await sleep(i * 120);
      try {
        return { buf: await makeCell(row, i), index: i };
      } catch (err) {
        console.warn(`  ! ${slug}[${i}]: ${err.message}`);
        return null;
      }
    }),
  );
  const ok = cells.filter(Boolean);
  if (!ok.length) return null;
  const cols = Math.min(COLS, picked.length);
  const rowsCount = Math.ceil(picked.length / cols);
  const width = cols * (CELL_W + PAD) + PAD;
  const height = rowsCount * (CELL_H + PAD) + PAD;
  const composites = ok.map((cell) => ({
    input: cell.buf,
    left: PAD + (cell.index % cols) * (CELL_W + PAD),
    top: PAD + Math.floor(cell.index / cols) * (CELL_H + PAD),
  }));
  const out = path.join(OUT_DIR, `${source}-${slug}.jpg`);
  await sharp({ create: { width, height, channels: 3, background: '#141414' } })
    .composite(composites)
    .jpeg({ quality: 80 })
    .toFile(out);
  console.log(`${slug}: ${ok.length}/${picked.length} -> ${out}`);
  return out;
}

const data = JSON.parse(await fs.readFile(CANDIDATES, 'utf8'));
await fs.mkdir(OUT_DIR, { recursive: true });
for (const [slug, rows] of Object.entries(data)) {
  if (only.length && !only.includes(slug)) continue;
  if (!rows?.length) continue;
  await buildSheet(slug, rows);
}

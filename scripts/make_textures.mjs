/**
 * Текстуры тумана для первого экрана и главы Шангри-Ла.
 *
 *   node scripts/make_textures.mjs
 *
 * Шум рисуется фильтром SVG feTurbulence и сохраняется в WebP с прозрачностью:
 * в браузере текстура только сдвигается, ничего не считается на лету.
 */
import sharp from 'sharp';

async function mist(file, { w, h, freq, seed, octaves, alpha }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <filter id="f" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${alpha} -${(alpha * 0.42).toFixed(3)}"/>
      </filter>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset="0.35" stop-color="#fff" stop-opacity="1"/>
        <stop offset="0.8" stop-color="#fff" stop-opacity="1"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <mask id="m"><rect width="100%" height="100%" fill="url(#g)"/></mask>
    </defs>
    <rect width="100%" height="100%" filter="url(#f)" mask="url(#m)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 70, alphaQuality: 80 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(file, meta.width, meta.height);
}

await mist('src/assets/textures/mist-a.webp', { w: 1800, h: 700, freq: '0.0022 0.0075', seed: 7, octaves: 4, alpha: 2.2 });
await mist('src/assets/textures/mist-b.webp', { w: 1800, h: 600, freq: '0.0035 0.011', seed: 23, octaves: 3, alpha: 2.0 });

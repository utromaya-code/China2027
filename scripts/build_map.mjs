/**
 * Готовит SVG-контуры для карты маршрута.
 *
 *   node scripts/build_map.mjs
 *
 * Источник — Natural Earth (public domain): провинции 1:50m, страны 1:50m,
 * реки 1:10m. Файлы берутся из репозитория natural-earth-vector и кешируются
 * в .tmp/geo. Результат — src/data/map-shapes.ts: готовые пути SVG и параметры
 * проекции, так что в рантайме и в зависимостях сайта картографии нет.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE = '.tmp/geo';
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const LAYERS = {
  provinces: 'ne_50m_admin_1_states_provinces',
  countries: 'ne_50m_admin_0_countries',
  rivers: 'ne_10m_rivers_lake_centerlines',
};

async function load(name) {
  const file = path.join(CACHE, `${name}.geojson`);
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    await fs.mkdir(CACHE, { recursive: true });
    const res = await fetch(`${NE}/${name}.geojson`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const text = await res.text();
    await fs.writeFile(file, text);
    return JSON.parse(text);
  }
}

/** Равнопромежуточная проекция с поправкой на широту середины рамки. */
function makeProjection(bounds, width) {
  const midLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const lonScale = Math.cos(midLat);
  const spanLon = (bounds.maxLon - bounds.minLon) * lonScale;
  const spanLat = bounds.maxLat - bounds.minLat;
  const scale = width / spanLon;
  const height = Math.round(spanLat * scale);
  return { ...bounds, lonScale, scale, width, height };
}

function project(p, lon, lat) {
  return [(lon - p.minLon) * p.lonScale * p.scale, (p.maxLat - lat) * p.scale];
}

/** Дуглас — Пекер в экранных координатах. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let t = ((px - ax) * dx + (py - ay) * dy) / len;
      t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px;
      const ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > sq && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Обрезка кольца по рамке (Сазерленд — Ходжман) в градусах. Без неё в файл
 * попадали бы целые Тибет и Сычуань, из которых на карте виден краешек.
 */
function clipRing(ring, b) {
  const edges = [
    (pt) => pt[0] >= b.minLon,
    (pt) => pt[0] <= b.maxLon,
    (pt) => pt[1] >= b.minLat,
    (pt) => pt[1] <= b.maxLat,
  ];
  const cross = [
    (a, c) => [b.minLon, a[1] + ((c[1] - a[1]) * (b.minLon - a[0])) / (c[0] - a[0])],
    (a, c) => [b.maxLon, a[1] + ((c[1] - a[1]) * (b.maxLon - a[0])) / (c[0] - a[0])],
    (a, c) => [a[0] + ((c[0] - a[0]) * (b.minLat - a[1])) / (c[1] - a[1]), b.minLat],
    (a, c) => [a[0] + ((c[0] - a[0]) * (b.maxLat - a[1])) / (c[1] - a[1]), b.maxLat],
  ];
  let out = ring;
  for (let e = 0; e < 4; e++) {
    const input = out;
    out = [];
    if (!input.length) break;
    let prev = input[input.length - 1];
    for (const cur of input) {
      const cin = edges[e](cur);
      const pin = edges[e](prev);
      if (cin) {
        if (!pin) out.push(cross[e](prev, cur));
        out.push(cur);
      } else if (pin) {
        out.push(cross[e](prev, cur));
      }
      prev = cur;
    }
  }
  return out;
}

function padded(p, pad) {
  return { minLon: p.minLon - pad, maxLon: p.maxLon + pad, minLat: p.minLat - pad, maxLat: p.maxLat + pad };
}

function lineToPath(p, coords, tolerance, close) {
  const pts = simplify(
    coords.map(([lon, lat]) => project(p, lon, lat)),
    tolerance,
  );
  if (pts.length < 2) return '';
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('') + (close ? 'Z' : '');
}

function polygons(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function lines(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

function intersects(coords, b, pad = 1.5) {
  return coords.some(
    ([lon, lat]) =>
      lon > b.minLon - pad && lon < b.maxLon + pad && lat > b.minLat - pad && lat < b.maxLat + pad,
  );
}

function featurePath(p, feature, tolerance) {
  const box = padded(p, 0.3);
  return polygons(feature.geometry)
    .map((poly) => clipRing(poly[0], box))
    .filter((ring) => ring.length > 3)
    .map((ring) => lineToPath(p, ring, tolerance, true))
    .filter((d) => d.length > 30)
    .join('');
}

function riverPaths(p, rivers, names, tolerance) {
  const out = [];
  for (const f of rivers.features) {
    const name = f.properties?.name;
    if (!names.includes(name)) continue;
    const box = padded(p, 0.2);
    for (const line of lines(f.geometry)) {
      // Режем линию на куски, лежащие внутри рамки.
      let run = [];
      const flush = () => {
        if (run.length > 1) {
          const d = lineToPath(p, run, tolerance, false);
          if (d) out.push({ name, d });
        }
        run = [];
      };
      for (const pt of line) {
        const inside = pt[0] > box.minLon && pt[0] < box.maxLon && pt[1] > box.minLat && pt[1] < box.maxLat;
        if (inside) run.push(pt);
        else flush();
      }
      flush();
    }
  }
  // Сегменты одной реки склеиваем в один путь.
  const merged = new Map();
  for (const { name, d } of out) merged.set(name, (merged.get(name) ?? '') + d);
  return [...merged].map(([name, d]) => ({ name, d }));
}

const [provinces, countries, rivers] = await Promise.all([
  load(LAYERS.provinces),
  load(LAYERS.countries),
  load(LAYERS.rivers),
]);

const chinaProvinces = provinces.features.filter((f) => f.properties.admin === 'China');
const HIGHLIGHT = ['Guangdong', 'Guangxi', 'Yunnan'];

function buildMap(bounds, width, opts) {
  const p = makeProjection(bounds, width);
  const provincePaths = chinaProvinces
    .map((f) => ({ name: f.properties.name, d: featurePath(p, f, opts.tolerance) }))
    .filter((x) => x.d);
  // Гонконг и Макао в Natural Earth — отдельные территории; рисуем их как сушу Китая,
  // чтобы в дельте Жемчужной реки не было дыр.
  const sar = countries.features
    .filter((f) => ['HKG', 'MAC'].includes(f.properties.ADM0_A3))
    .map((f) => featurePath(p, f, opts.tolerance))
    .join('');
  const neighbours = countries.features
    .filter((f) => ['VNM', 'LAO', 'MMR', 'THA'].includes(f.properties.ADM0_A3))
    .map((f) => ({ name: f.properties.NAME, d: featurePath(p, f, opts.tolerance) }))
    .filter((x) => x.d);
  const riverList = riverPaths(p, rivers, opts.rivers, opts.riverTolerance);
  return {
    projection: {
      minLon: p.minLon,
      maxLon: p.maxLon,
      minLat: p.minLat,
      maxLat: p.maxLat,
      lonScale: Math.round(p.lonScale * 1e6) / 1e6,
      scale: Math.round(p.scale * 1e4) / 1e4,
      width: p.width,
      height: p.height,
    },
    provinces: provincePaths.map((x) => ({ ...x, highlight: HIGHLIGHT.includes(x.name) })),
    sar,
    neighbours,
    rivers: riverList,
  };
}

const main = buildMap({ minLon: 97.9, maxLon: 116.0, minLat: 20.9, maxLat: 29.3 }, 1000, {
  tolerance: 0.7,
  riverTolerance: 0.6,
  rivers: ['Xi', 'Yu', 'Hongshui', 'Bei', 'Dong', 'Jinsha', 'Chang Jiang', 'Yangtze', 'Lancang', 'Nu', 'Yalong', 'Liu', 'Yuan', 'Wu', 'Nanpan', 'Hong'],
});

const inset = buildMap({ minLon: 98.95, maxLon: 101.25, minLat: 26.55, maxLat: 28.25 }, 600, {
  tolerance: 0.5,
  riverTolerance: 0.4,
  rivers: ['Jinsha', 'Lancang', 'Nu', 'Yalong'],
});

const out = `// Файл создан скриптом scripts/build_map.mjs — вручную не редактировать.
// Контуры: Natural Earth (public domain) — провинции и страны 1:50m, реки 1:10m.

export interface MapShapes {
  projection: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
    lonScale: number;
    scale: number;
    width: number;
    height: number;
  };
  provinces: { name: string; d: string; highlight: boolean }[];
  sar: string;
  neighbours: { name: string; d: string }[];
  rivers: { name: string; d: string }[];
}

export const mainMap: MapShapes = ${JSON.stringify(main)};

export const insetMap: MapShapes = ${JSON.stringify(inset)};
`;

await fs.writeFile('src/data/map-shapes.ts', out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`map-shapes.ts: ${kb} KB; провинций ${main.provinces.length}/${inset.provinces.length}, рек ${main.rivers.length}/${inset.rivers.length}`);

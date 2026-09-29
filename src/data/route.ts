/**
 * Точки и отрезки карты маршрута. Координаты — градусы (долгота, широта).
 * Контуры провинций и рек — в map-shapes.ts (собирается scripts/build_map.mjs).
 */

export interface MapPoint {
  id: string;
  name: string;
  hanzi: string;
  lon: number;
  lat: number;
  /** Дни, в которые мы здесь, — подпись и ссылка на программу. */
  days?: string;
  anchor?: string;
  /** Смещение подписи относительно точки, px. */
  label?: { dx: number; dy: number; align?: 'start' | 'end' | 'middle' };
  minor?: boolean;
}

export type SegmentKind = 'train' | 'flight' | 'road';

export interface Segment {
  from: string;
  to: string;
  kind: SegmentKind;
  /** Изгиб дуги: доля длины отрезка, знак — сторона. */
  bend?: number;
}

export const mainPoints: readonly MapPoint[] = [
  { id: 'guangzhou', name: 'Гуанчжоу', hanzi: '广州', lon: 113.264, lat: 23.129, days: 'день 1', anchor: 'den-1', label: { dx: 12, dy: -10 } },
  { id: 'foshan', name: 'Фошань', hanzi: '佛山', lon: 113.122, lat: 23.021, days: 'день 2', anchor: 'den-2', label: { dx: -12, dy: 22, align: 'end' } },
  { id: 'yangshuo', name: 'Яншо', hanzi: '阳朔', lon: 110.496, lat: 24.778, days: 'дни 3–5', anchor: 'den-3', label: { dx: -12, dy: 18, align: 'end' } },
  { id: 'guilin', name: 'аэропорт Гуйлинь', hanzi: '桂林', lon: 110.039, lat: 25.218, minor: true, label: { dx: 10, dy: -8 } },
  { id: 'lijiang', name: 'Лицзян', hanzi: '丽江', lon: 100.227, lat: 26.872, days: 'дни 8–11', anchor: 'den-10', label: { dx: 12, dy: 20 } },
  { id: 'shangrila', name: 'Шангри-Ла', hanzi: '香格里拉', lon: 99.706, lat: 27.826, days: 'дни 6–8', anchor: 'shangri-la', label: { dx: 16, dy: -6 } },
];

export const mainSegments: readonly Segment[] = [
  { from: 'guangzhou', to: 'foshan', kind: 'road' },
  { from: 'guangzhou', to: 'yangshuo', kind: 'train', bend: -0.06 },
  { from: 'yangshuo', to: 'guilin', kind: 'road' },
  { from: 'guilin', to: 'lijiang', kind: 'flight', bend: 0.16 },
  { from: 'lijiang', to: 'shangrila', kind: 'road', bend: 0.18 },
];

/** Крупный план северо-запада Юньнани: дни 6–10. */
export const insetPoints: readonly MapPoint[] = [
  { id: 'lijiang', name: 'Лицзян', hanzi: '丽江', lon: 100.227, lat: 26.872, anchor: 'den-10', label: { dx: 12, dy: 6 } },
  { id: 'yulong', name: 'Юйлун, 5 596', hanzi: '玉龙雪山', lon: 100.175, lat: 27.098, anchor: 'den-10', label: { dx: 12, dy: 4 } },
  { id: 'gorge', name: 'Ущелье\nПрыгающего тигра', hanzi: '虎跳峡', lon: 100.108, lat: 27.188, anchor: 'den-6', label: { dx: -12, dy: -6, align: 'end' } },
  { id: 'baishuitai', name: 'Байшуйтай', hanzi: '白水台', lon: 100.025, lat: 27.502, anchor: 'den-6', label: { dx: 12, dy: 4 } },
  { id: 'shangrila', name: 'Шангри-Ла', hanzi: '香格里拉', lon: 99.706, lat: 27.826, anchor: 'shangri-la', label: { dx: -12, dy: 24, align: 'end' } },
  { id: 'songzanlin', name: 'Сонгцзанлин', hanzi: '松赞林寺', lon: 99.689, lat: 27.874, anchor: 'den-7', minor: true, label: { dx: -12, dy: 6, align: 'end' } },
  { id: 'napahai', name: 'Напахай', hanzi: '纳帕海', lon: 99.63, lat: 27.9, anchor: 'den-7', minor: true, label: { dx: -10, dy: -12, align: 'end' } },
  { id: 'dabao', name: 'Дабао', hanzi: '大宝寺', lon: 99.86, lat: 27.8, anchor: 'den-8', minor: true, label: { dx: 0, dy: 30, align: 'middle' } },
  { id: 'shudu', name: 'Шуду, 3 705', hanzi: '属都湖', lon: 99.942, lat: 27.908, anchor: 'den-8', minor: true, label: { dx: 12, dy: -8 } },
  { id: 'lugu', name: 'Лугу', hanzi: '泸沽湖', lon: 100.785, lat: 27.715, anchor: 'den-9', label: { dx: -12, dy: -14, align: 'end' } },
];

export const insetSegments: readonly Segment[] = [
  { from: 'lijiang', to: 'gorge', kind: 'road', bend: 0.1 },
  { from: 'gorge', to: 'baishuitai', kind: 'road', bend: -0.12 },
  { from: 'baishuitai', to: 'shangrila', kind: 'road', bend: 0.1 },
  { from: 'shangrila', to: 'songzanlin', kind: 'road' },
  { from: 'shangrila', to: 'napahai', kind: 'road', bend: 0.2 },
  { from: 'shangrila', to: 'dabao', kind: 'road', bend: -0.1 },
  { from: 'dabao', to: 'shudu', kind: 'road', bend: 0.1 },
  { from: 'lijiang', to: 'lugu', kind: 'road', bend: -0.1 },
  { from: 'lijiang', to: 'yulong', kind: 'road', bend: 0.1 },
];

export const provinceLabels = [
  { name: 'Юньнань', hanzi: '云南', lon: 101.6, lat: 24.1 },
  { name: 'Гуанси', hanzi: '广西', lon: 108.2, lat: 23.6 },
  { name: 'Гуандун', hanzi: '广东', lon: 113.6, lat: 24.4 },
  { name: 'Сычуань', hanzi: '四川', lon: 101.9, lat: 28.9 },
] as const;

export const riverLabels = {
  main: [{ name: 'Цзиньша', lon: 101.2, lat: 26.25 }],
  inset: [
    { name: 'Цзиньша', lon: 100.35, lat: 27.43 },
    { name: 'Меконг', lon: 99.33, lat: 27.55 },
  ],
} as const;

export const routeSection = {
  title: 'Маршрут',
  lead: 'Юг — поездом, в Юньнань — самолётом, дальше — дорогами нагорья. Отмечены места, где мы ночуем и что увидим.',
  insetTitle: 'Северо-запад Юньнани',
  insetLead: 'Здесь сходятся Три параллельные реки — объект ЮНЕСКО. Цзиньша, верховье Янцзы, делает у Лицзяна крутую петлю и уходит в ущелье Прыгающего тигра.',
  legend: { train: 'поезд', flight: 'перелёт', road: 'дорога' },
} as const;

/** Проекция точки в координаты SVG для карты с заданной проекцией. */
export function projectPoint(
  p: { minLon: number; maxLat: number; lonScale: number; scale: number },
  lon: number,
  lat: number,
): [number, number] {
  return [(lon - p.minLon) * p.lonScale * p.scale, (p.maxLat - lat) * p.scale];
}

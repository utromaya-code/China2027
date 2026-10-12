// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Адрес сайта и базовый путь берутся из переменных окружения, чтобы один и тот же
 * код работал и на GitHub Pages (проектный подкаталог), и на собственном домене.
 *
 *   SITE_URL   — полный адрес сайта: canonical, OpenGraph, sitemap.
 *   BASE_PATH  — подкаталог сайта ('/' на своём домене, '/China2027' — на адресе GitHub Pages).
 *
 * Пустые переменные GitHub Actions не должны перебивать рабочие значения,
 * поэтому здесь логический fallback, а не nullish coalescing.
 */
const SITE_URL = process.env.SITE_URL?.trim() || 'https://shangrila-trip.ru';
const BASE_PATH = process.env.BASE_PATH?.trim() || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/privacy') })],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});

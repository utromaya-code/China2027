// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Адрес сайта и базовый путь берутся из переменных окружения, чтобы один и тот же
 * код работал и на GitHub Pages (проектный подкаталог), и на собственном домене.
 *
 *   SITE_URL   — полный адрес сайта: canonical, OpenGraph, sitemap.
 *   BASE_PATH  — подкаталог сайта ('/China2027' на GitHub Pages или '/' на своём домене).
 *
 * Пустые переменные GitHub Actions не должны перебивать рабочие значения,
 * поэтому здесь логический fallback, а не nullish coalescing.
 */
const SITE_URL = process.env.SITE_URL?.trim() || 'https://utromaya-code.github.io';
const BASE_PATH = process.env.BASE_PATH?.trim() || '/China2027';

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

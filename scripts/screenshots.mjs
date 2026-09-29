/**
 * Снимает страницу на разных ширинах и проверяет базовые вещи:
 * горизонтальный скролл, доступность с клавиатуры, битые ссылки.
 *
 *   node scripts/screenshots.mjs [url]
 */
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:4321/China2027/';
const OUT = '.tmp/shots';

const VIEWPORTS = [
  { name: 'iphone-se-375', width: 375, height: 812, mobile: true },
  { name: 'iphone-390', width: 390, height: 844, mobile: true },
  { name: 'iphone-max-430', width: 430, height: 932, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
];

await fs.mkdir(OUT, { recursive: true });

// В этом окружении браузер уже установлен — берём его, а не качаем свой.
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const problems = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });

  // Раскрываем всё, что можно раскрыть, и прокручиваем до низа,
  // чтобы отложенные изображения и анимации успели отработать.
  // behavior: 'instant' обязателен: на сайте включён scroll-behavior: smooth,
  // и обычный scrollTo превращает проход по странице в медленную анимацию,
  // которая не успевает дойти до низа.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(900);

  // Горизонтальный скролл — частая беда на мобильных
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) {
    // Ищем, какой именно элемент вылезает за правый край
    const culprits = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      return [...document.querySelectorAll('*')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.right > limit + 1 && r.width > 0)
        .slice(0, 5)
        .map(
          ({ el, r }) =>
            `${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? '')
              .toString()
              .split(' ')
              .filter(Boolean)
              .join('.')} right=${Math.round(r.right)}`,
        );
    });
    problems.push(`${vp.name}: горизонтальный скролл ${overflow}px → ${culprits.join(' ; ')}`);
  }

  // После прохода по всей странице ни один блок не должен остаться скрытым:
  // иначе при быстрой прокрутке пользователь увидит пустое место.
  const hidden = await page.evaluate(
    () => document.querySelectorAll('.reveal:not(.is-visible)').length,
  );
  if (hidden) problems.push(`${vp.name}: ${hidden} блоков не проявились после прокрутки`);

  await page.screenshot({ path: `${OUT}/${vp.name}.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${vp.name}-fold.png`, fullPage: false });

  if (consoleErrors.length) {
    problems.push(`${vp.name}: ошибки в консоли — ${consoleErrors.slice(0, 3).join(' | ')}`);
  }

  console.log(`${vp.name}: снято${overflow > 1 ? ` (overflow ${overflow}px)` : ''}`);
  await context.close();
}

/* Проверки на одном разрешении: ссылки, клавиатура, состояние аккордеонов */
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });

const anchors = await page.$$eval('a[href^="#"]', (els) =>
  els.map((e) => e.getAttribute('href')).filter((h) => h && h !== '#'),
);
for (const href of new Set(anchors)) {
  const exists = await page.$(href);
  if (!exists) problems.push(`битая якорная ссылка: ${href}`);
}

const external = await page.$$eval('a[href^="http"]', (els) => els.map((e) => e.href));
console.log(`якорей: ${new Set(anchors).size}, внешних ссылок: ${new Set(external).size}`);

// Клавиатура: доходим ли табом до кнопки отправки
await page.keyboard.press('Tab');
const firstFocus = await page.evaluate(() => document.activeElement?.className ?? '');
if (!firstFocus.includes('skip-link')) {
  problems.push(`первый Tab ведёт не на «К основному содержанию», а на .${firstFocus}`);
}

// Аккордеоны должны открываться с клавиатуры
const faqBtn = await page.$('.faq__q');
if (faqBtn) {
  await faqBtn.focus();
  await page.keyboard.press('Enter');
  // Вопросы сделаны на <details>/<summary>: открытие видно по атрибуту open.
  const open = await faqBtn.evaluate((el) => el.closest('details')?.open ?? false);
  if (!open) problems.push('FAQ не открывается клавишей Enter');
}

// Изображения без alt
// Декоративные снимки помечены role="presentation" или лежат в aria-hidden —
// им alt не нужен, всем остальным обязателен.
const noAlt = await page.$$eval('img', (els) =>
  els.filter(
    (e) =>
      e.getAttribute('alt') === null &&
      e.getAttribute('role') !== 'presentation' &&
      !e.closest('[aria-hidden="true"]'),
  ).length,
);
if (noAlt) problems.push(`${noAlt} изображений без alt`);

await context.close();
await browser.close();

console.log('\n' + (problems.length ? 'Проблемы:\n- ' + problems.join('\n- ') : 'Проблем не найдено'));
process.exit(problems.length ? 1 : 0);

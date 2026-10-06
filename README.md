# Китай: путь в Шангри-Ла

Лендинг авторского путешествия по Китаю, 23 марта — 2 апреля 2027:
Гуанчжоу, Фошань, Яншо, Шангри-Ла, Лицзян, озеро Лугу, снежная гора Юйлун.
Ведущие — Илья Баринов, Андрей Баранов, Елена Бакина.

Astro + TypeScript, статическая сборка, деплой на GitHub Pages.

- ТЗ: [docs/TZ.md](docs/TZ.md)
- Исследование маршрута с источниками: [docs/RESEARCH.md](docs/RESEARCH.md)
- Что ещё нужно от организаторов: [CONTENT_NEEDED.md](CONTENT_NEEDED.md)

---

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:4321/China2027
```

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Дев-сервер |
| `npm run build` | Сборка в `dist/` |
| `npm run preview` | Просмотр собранного сайта |
| `npm run typecheck` | Проверка типов (`astro check`) |
| `npm run fonts` | Пересобрать урезанные шрифты для иероглифов и тибетского |

Нужен Node 22+.

---

## Где лежит контент

Тексты не зашиты в вёрстку — всё в `src/data/`:

| Файл | Что внутри |
| --- | --- |
| `trip.ts` | Даты, контакты, цена и состав, первый экран |
| `days.ts` | Программа по дням: тексты, «иероглиф дня», легенды, фото, главы |
| `reasons.ts` | «Семь причин поехать в Китай этой весной» |
| `shangrila.ts` | Глава о Шангри-Ла: легенда имени, места силы, как себя вести |
| `route.ts` | Точки и отрезки карты |
| `leaders.ts` | Ведущие |
| `memories.ts` | «Как это было»: фото прошлой поездки, отзывы (пустой список на сайт не выводится) |
| `practical.ts` | Погода, высота, въезд |
| `faq.ts` | Вопросы и ответы |
| `credits.json` | Авторы и лицензии фотографий (создаётся скриптом) |

Правка текста — правка файла в `src/data/`. Факты сверены с источниками из
`docs/RESEARCH.md`; легенды подаются как легенды.

### Неподтверждённые данные

Поля со значением `TODO_CONTENT` (из `src/data/content.ts`) на сайт не выводятся.
Сборка печатает их списком; с `STRICT_CONTENT=1` сборка падает, пока список не пуст.

### Иероглифы

Кистевой шрифт (Zhi Mang Xing), шрифт для мелких иероглифов (Noto Serif SC) и тибетский
(Jomolhari) урезаны до знаков, которые есть на сайте, — это десятки килобайт вместо
мегабайт. **Если добавили в тексты новый иероглиф или тибетскую букву — запустите
`npm run fonts`**, иначе знак отрисуется запасным шрифтом.

---

## Фотографии

Файлы — в `src/assets/photos/`, ключ в данных = имя файла без расширения
(`image: 'lugu-boats'` → `src/assets/photos/lugu-boats.jpg`). Astro сам делает WebP
и срезы под разные экраны.

Все пейзажи — из Wikimedia Commons и Flickr (через Openverse) под лицензиями,
разрешающими коммерческое использование: CC0, Public Domain, CC BY, CC BY-SA.
Автор, лицензия и ссылка на оригинал — в `src/data/credits.json`, выводятся в подвале.
Портреты ведущих и кадры `past-*` («Как это было») — из архива организаторов.

**Заменили фото своим — удалите его запись из `credits.json`**, иначе в подвале останется
чужое авторство.

Подбор новых кадров:

```bash
python3 scripts/search_commons.py     # кандидаты с Commons -> commons.json (медленно: лимиты)
python3 scripts/search_openverse.py   # кандидаты с Openverse -> openverse.json
node scripts/contact_sheets.mjs openverse <рубрика>   # контактные листы -> .tmp/sheets/
# выбрать номер кадра, вписать в picks.json
node scripts/fetch_selected.mjs       # скачать выбранное и обновить credits.json
```

---

## Карта

Контуры провинций, стран и реки — Natural Earth (public domain), пересчитаны в SVG
скриптом `scripts/build_map.mjs` и сохранены в `src/data/map-shapes.ts`. В рантайме
картографии нет. Поменяли рамку карты — пересоберите: `node scripts/build_map.mjs`.

---

## Заявки

Форма отправляет JSON на адрес из `PUBLIC_LEAD_FORM_ENDPOINT` (секрет репозитория).
Если адрес не задан, заявка открывается в Telegram @vsemaya готовым сообщением —
данные не теряются. Формат — интерфейс `Lead` в `src/scripts/lead.ts`.

---

## Деплой

GitHub Actions собирает и публикует сайт при каждом пуше в `main`
(`.github/workflows/deploy.yml`).

**Включить один раз:** Settings → Pages → Source: **GitHub Actions**.
После этого сайт живёт по адресу `https://utromaya-code.github.io/China2027/`.

### Домен

| Переменная репозитория | По умолчанию | Для своего домена |
| --- | --- | --- |
| `SITE_URL` | `https://utromaya-code.github.io` | `https://example.ru` |
| `BASE_PATH` | `/China2027` | `/` |

1. Settings → Pages → Custom domain — вписать домен;
2. в DNS — `CNAME` на `utromaya-code.github.io`;
3. Settings → Secrets and variables → Actions → **Variables** — задать `SITE_URL` и `BASE_PATH`;
4. перезапустить сборку и поправить адрес карты сайта в `public/robots.txt`.

---

## Проверка перед публикацией

```bash
npm run typecheck && npm run build
npm run preview &
node scripts/screenshots.mjs     # 5 ширин: горизонтальный скролл, якоря, alt, клавиатура
node scripts/walk.mjs            # обход страницы экран за экраном -> .tmp/walk-1440
node scripts/contrast.mjs        # контраст текста на фото первого экрана, по пикселям
```

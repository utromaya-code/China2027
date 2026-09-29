#!/usr/bin/env python3
"""Поиск фотографий для сайта на Wikimedia Commons.

Commons отдаёт оригиналы высокого разрешения и полные данные о лицензии
и авторе в extmetadata. Результат складывается в commons.json:
{ "<рубрика>": [ {title, creator, license, url, thumb, width, height, ...}, ... ] }

    python3 scripts/search_commons.py            # все рубрики
    python3 scripts/search_commons.py sl-baiji   # только указанные

Уже заполненные рубрики повторно не запрашиваются.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "china2027-landing/1.0 (travel landing page; image sourcing; contact via GitHub utromaya-code)"

# Commons жёстко ограничивает частоту запросов: идём медленно
# и слушаем Retry-After, а не долбим повторами.
DELAY_SECONDS = 4.0
MAX_RETRIES = 8
PER_QUERY = 16
MIN_WIDTH = 1200

# Лицензии, которые не подходят для коммерческого сайта.
BAD_LICENSE_MARKERS = ("nc", "nd", "fair use", "non-free")

QUERIES = {
    # Гуанчжоу
    "gz-skyline": ["Guangzhou skyline night", "Zhujiang New Town night", "Pearl River Guangzhou night"],
    "gz-canton-tower": ["Canton Tower night", "Canton Tower"],
    "gz-xiguan": ["Enning Road Guangzhou", "Yongqingfang Guangzhou", "Guangzhou qilou arcade"],
    "gz-shamian": ["Shamian Island", "Shamian Guangzhou street"],
    "gz-chen-clan": ["Chen Clan Academy", "Chen Clan Ancestral Hall roof"],
    "gz-five-rams": ["Five Rams Sculpture Guangzhou", "Five Goats statue Yuexiu"],
    "gz-dimsum": ["dim sum Guangzhou", "yum cha Cantonese"],
    "gz-beijing-road": ["Beijing Road Guangzhou", "Beijing Road ancient road ruins"],
    # Фошань
    "fs-zumiao": ["Foshan Ancestral Temple", "Foshan Zumiao"],
    "fs-ipman": ["Ip Man Tong Foshan", "Ip Man statue Foshan"],
    "fs-wingchun": ["Wing Chun wooden dummy", "Wing Chun training", "Wing Chun kung fu practice"],
    "fs-lion-dance": ["Foshan lion dance", "Cantonese lion dance"],
    "fs-lingnan": ["Lingnan Tiandi", "Foshan old street"],
    # Яншо
    "ys-karst-mist": ["Yangshuo karst mist", "Li River mist karst", "Guilin karst fog morning"],
    "ys-li-river": ["Li River Xingping", "Li River bamboo raft", "Li River Guilin landscape"],
    "ys-yulong": ["Yulong River bamboo raft", "Yulong River Yangshuo", "Yulong Bridge Yangshuo"],
    "ys-west-street": ["West Street Yangshuo", "Yangshuo town night"],
    "ys-peak": ["Xianggong Hill", "Laozhai Hill", "Yangshuo view from hill"],
    "ys-moon-hill": ["Moon Hill Yangshuo"],
    "ys-countryside": ["Yangshuo countryside", "Yangshuo rice field karst", "Yangshuo cycling"],
    "ys-cormorant": ["cormorant fisherman Li River", "cormorant fishing Guilin"],
    "ys-food": ["beer fish Yangshuo", "Guilin rice noodles"],
    # Дорога в Шангри-Ла
    "tiger-gorge": ["Tiger Leaping Gorge", "Tiger Leaping Gorge Jinsha River"],
    "baishuitai": ["Baishuitai", "Baishuitai terraces"],
    # Шангри-Ла
    "sl-songzanlin": ["Songzanlin Monastery", "Ganden Sumtseling Monastery", "Songzanlin"],
    "sl-monks": ["Songzanlin monk", "Tibetan monks Shangri-La", "Tibetan Buddhist monks chanting"],
    "sl-dukezong": ["Dukezong", "Shangri-La old town", "Zhongdian old town"],
    "sl-prayer-wheel": ["Shangri-La prayer wheel", "Guishan Park Shangri-La"],
    "sl-napahai": ["Napahai", "Napa Lake Shangri-La", "Napa Hai"],
    "sl-cranes": ["Grus nigricollis", "black-necked crane"],
    "sl-baiji": ["Baiji Temple Shangri-La", "Baiji Si Shangri-La"],
    "sl-prayer-flags": ["prayer flags Shangri-La", "prayer flags Yunnan", "Tibetan prayer flags mountain"],
    "sl-dabao": ["Dabao Temple Shangri-La", "Dabao Monastery Zhongdian"],
    "sl-printing": ["Tibetan woodblock printing", "Derge Parkhang printing", "sutra woodblocks"],
    "sl-shudu": ["Shudu Lake", "Potatso National Park", "Pudacuo National Park"],
    "sl-landscape": ["Shangri-La Yunnan landscape", "Zhongdian grassland", "Diqing landscape"],
    "sl-mani": ["mani stones Yunnan", "mani stone Tibetan"],
    "sl-butter-lamps": ["butter lamps Tibetan", "butter lamp monastery"],
    # Лицзян и окрестности
    "lj-old-town": ["Lijiang Old Town", "Lijiang old town night", "Dayan Lijiang"],
    "lj-dongba": ["Dongba script", "Dongba manuscript"],
    "lj-black-dragon": ["Black Dragon Pool Lijiang", "Heilongtan Lijiang"],
    "yulong": ["Jade Dragon Snow Mountain", "Yulong Snow Mountain", "Yulong Xueshan"],
    "yulong-blue-moon": ["Blue Moon Valley Lijiang", "Blue Moon Valley Yulong"],
    "lugu": ["Lugu Lake", "Lugu Lake boat", "Lugu Lake sunrise"],
    "lugu-mosuo": ["Mosuo", "Mosuo Lugu Lake"],
}


def api(params: dict):
    params = {**params, "format": "json", "formatversion": "2"}
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == MAX_RETRIES - 1:
                raise
            wait = int(exc.headers.get("Retry-After") or 10) + 2
            print(f"    429, пауза {wait}s", file=sys.stderr, flush=True)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def clean(html: str | None) -> str:
    if not html:
        return ""
    out, depth = [], 0
    for ch in html:
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth -= 1
        elif depth == 0:
            out.append(ch)
    return " ".join("".join(out).split())


def search(query: str):
    try:
        data = api(
            {
                "action": "query",
                "generator": "search",
                "gsrsearch": query,
                "gsrnamespace": "6",
                "gsrlimit": str(PER_QUERY),
                "prop": "imageinfo",
                "iiprop": "url|size|extmetadata",
                "iiurlwidth": "500",
            }
        )
    except Exception as exc:  # noqa: BLE001
        print(f"  ! {query}: {exc}", file=sys.stderr)
        return []

    rows = []
    for page in data.get("query", {}).get("pages", []) or []:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {}) or {}
        lic = (meta.get("LicenseShortName", {}).get("value") or "").lower()
        if any(m in lic for m in BAD_LICENSE_MARKERS):
            continue
        if (info.get("width") or 0) < MIN_WIDTH:
            continue
        if not (info.get("url") or "").lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff")):
            continue
        rows.append(
            {
                "title": page.get("title"),
                "creator": clean(meta.get("Artist", {}).get("value")),
                "license": meta.get("LicenseShortName", {}).get("value"),
                "license_url": meta.get("LicenseUrl", {}).get("value"),
                "description": clean(meta.get("ImageDescription", {}).get("value"))[:300],
                "url": info.get("url"),
                "thumb": info.get("thumburl"),
                "width": info.get("width"),
                "height": info.get("height"),
                "size": info.get("size"),
                "descriptionurl": info.get("descriptionurl"),
                "source": "Wikimedia Commons",
            }
        )
    return rows


def main():
    out = {}
    if os.path.exists("commons.json"):
        with open("commons.json", encoding="utf-8") as fh:
            out = json.load(fh)

    only = sys.argv[1:]
    for slug, queries in QUERIES.items():
        if only and slug not in only:
            continue
        if out.get(slug):
            continue
        seen, rows = set(), []
        for q in queries:
            for r in search(q):
                if r["url"] in seen:
                    continue
                seen.add(r["url"])
                rows.append(r)
            time.sleep(DELAY_SECONDS)
        out[slug] = rows
        print(f"{slug:20s} {len(rows):2d}", flush=True)
        with open("commons.json", "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)

    print(f"\nВсего: {sum(len(v) for v in out.values())} -> commons.json", flush=True)


if __name__ == "__main__":
    main()

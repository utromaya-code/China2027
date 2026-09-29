#!/usr/bin/env python3
"""Поиск фотографий через Openverse (Flickr CC, Wikimedia и др.).

Openverse пригодился как второй источник: Commons отвечает на поиск с паузами
по 40+ секунд, а Openverse отдаёт до 20 запросов в минуту и знает те же
лицензии. Результат — openverse.json в том же формате, что commons.json.

    python3 scripts/search_openverse.py [рубрика ...]

Анонимный лимит — 200 запросов в сутки, поэтому уже собранное
повторно не запрашивается.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.openverse.org/v1/images/"
UA = "china2027-landing/1.0 (travel landing page; image sourcing)"
DELAY_SECONDS = 3.5
MIN_WIDTH = 1000

# Второй фильтр поверх license_type: производные запрещены — не берём.
BAD = ("nc", "nd")

QUERIES = {
    "gz-skyline": ["Guangzhou skyline night"],
    "gz-xiguan": ["Enning Road Guangzhou", "Yongqingfang"],
    "gz-shamian": ["Shamian Island Guangzhou"],
    "gz-chen-clan": ["Chen Clan Academy Guangzhou"],
    "gz-dimsum": ["dim sum Guangzhou"],
    "gz-five-rams": ["five rams statue Guangzhou"],
    "fs-zumiao": ["Foshan Ancestral Temple"],
    "fs-ipman": ["Ip Man Foshan"],
    "fs-wingchun": ["wing chun"],
    "fs-lion-dance": ["lion dance Foshan"],
    "ys-karst-mist": ["Yangshuo mist", "Li River fog karst"],
    "ys-li-river": ["Xingping Li River"],
    "ys-yulong": ["Yulong River bamboo raft"],
    "ys-west-street": ["West Street Yangshuo"],
    "ys-peak": ["Yangshuo view from top", "Xianggong Hill"],
    "ys-moon-hill": ["Moon Hill Yangshuo"],
    "ys-countryside": ["Yangshuo bicycle countryside"],
    "ys-cormorant": ["cormorant fisherman Li River"],
    "ys-food": ["beer fish Yangshuo"],
    "tiger-gorge": ["Tiger Leaping Gorge"],
    "baishuitai": ["Baishuitai"],
    "sl-songzanlin": ["Songzanlin"],
    "sl-monks": ["Songzanlin monk", "Shangri-La monk"],
    "sl-dukezong": ["Dukezong", "Shangri-La old town"],
    "sl-prayer-wheel": ["Shangri-La prayer wheel"],
    "sl-napahai": ["Napa Lake Shangri-La", "Napahai"],
    "sl-cranes": ["black-necked crane"],
    "sl-baiji": ["Shangri-La prayer flags hill", "Baiji Shangri-La"],
    "sl-prayer-flags": ["prayer flags Yunnan"],
    "sl-dabao": ["Dabao Temple Shangri-La", "Ringha Shangri-La"],
    "sl-printing": ["Tibetan woodblock printing", "sutra printing woodblock"],
    "sl-shudu": ["Shudu Lake", "Potatso National Park"],
    "sl-hot-spring": ["Shangri-La hot spring"],
    "sl-landscape": ["Zhongdian", "Shangri-La Yunnan"],
    "sl-butter-lamps": ["butter lamps"],
    "sl-mani": ["mani stones Tibetan"],
    "lj-old-town": ["Lijiang old town", "Lijiang night"],
    "lj-dongba": ["Dongba"],
    "lj-black-dragon": ["Black Dragon Pool Lijiang"],
    "yulong": ["Jade Dragon Snow Mountain"],
    "yulong-blue-moon": ["Blue Moon Valley Lijiang"],
    "lugu": ["Lugu Lake"],
    "lugu-mosuo": ["Mosuo"],
}


def search(query: str):
    params = {
        "q": query,
        "license_type": "commercial,modification",
        "page_size": "20",
        "mature": "false",
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            break
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 4:
                print(f"  ! {query}: HTTP {exc.code}", file=sys.stderr)
                return []
            wait = int(exc.headers.get("Retry-After") or 30) + 2
            print(f"    429, пауза {wait}s", file=sys.stderr, flush=True)
            time.sleep(wait)
    rows = []
    for r in data.get("results", []):
        lic = (r.get("license") or "").lower()
        if any(b in lic for b in BAD):
            continue
        if (r.get("width") or 0) and r["width"] < MIN_WIDTH:
            continue
        rows.append(
            {
                "title": r.get("title"),
                "creator": r.get("creator") or "",
                "license": f"CC {lic.upper()} {r.get('license_version') or ''}".strip()
                if lic not in ("cc0", "pdm")
                else lic.upper(),
                "license_url": r.get("license_url"),
                "description": "",
                "url": r.get("url"),
                "thumb": r.get("thumbnail") or r.get("url"),
                "width": r.get("width"),
                "height": r.get("height"),
                "descriptionurl": r.get("foreign_landing_url"),
                "source": {"flickr": "Flickr", "wikimedia": "Wikimedia Commons"}.get(
                    r.get("source"), r.get("source") or "Openverse"
                ),
                "attribution": r.get("attribution"),
            }
        )
    return rows


def main():
    out = {}
    if os.path.exists("openverse.json"):
        with open("openverse.json", encoding="utf-8") as fh:
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
        with open("openverse.json", "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)
    print(f"\nВсего: {sum(len(v) for v in out.values())} -> openverse.json", flush=True)


if __name__ == "__main__":
    main()

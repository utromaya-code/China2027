#!/usr/bin/env python3
"""Урезает шрифты для иероглифов и тибетского письма до знаков, которые есть на сайте.

Полный кистевой шрифт весит мегабайты, а на сайте три-четыре десятка иероглифов.
Google Fonts умеет отдавать шрифт только с нужными знаками (параметр text=),
поэтому скрипт собирает все иероглифы и тибетские буквы из src/, скачивает
урезанные woff2 в src/assets/fonts/ и пишет src/styles/fonts-extra.css.

    python3 scripts/subset_fonts.py        # или npm run fonts

Запускать после любой правки иероглифов в текстах. Шрифты — под лицензией OFL.
"""
import os
import re
import subprocess
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT_FONTS = os.path.join(SRC, "assets", "fonts")
OUT_CSS = os.path.join(SRC, "styles", "fonts-extra.css")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

CJK = re.compile(r"[㐀-䶿一-鿿豈-﫿　-〿，：；]")
TIBETAN = re.compile(r"[ༀ-࿿]")

# Базовый набор на случай, если знак появится только в разметке: цифры и частые знаки.
BASE_CJK = "一二三四五六七八九十日月中国道心"

FONTS = [
    # (семейство Google Fonts, параметры, файл, семейство в CSS, какой набор знаков)
    ("Zhi Mang Xing", "", "brush.woff2", "Brush Hanzi", "cjk"),
    ("Noto Serif SC", ":wght@500", "hanzi-serif.woff2", "Hanzi Serif", "cjk"),
    ("Jomolhari", "", "tibetan.woff2", "Tibetan Uchen", "tibetan"),
]


def collect():
    cjk, tib = set(BASE_CJK), set()
    for base, _, files in os.walk(SRC):
        for name in files:
            if not name.endswith((".ts", ".astro", ".md")):
                continue
            with open(os.path.join(base, name), encoding="utf-8") as fh:
                text = fh.read()
            cjk.update(CJK.findall(text))
            tib.update(TIBETAN.findall(text))
    return "".join(sorted(cjk)), "".join(sorted(tib))


def fetch(url):
    return subprocess.run(["curl", "-sSf", "-A", UA, url], capture_output=True, check=True).stdout


def main():
    cjk, tib = collect()
    print(f"иероглифов: {len(cjk)}, тибетских знаков: {len(tib)}")
    os.makedirs(OUT_FONTS, exist_ok=True)
    css_parts = [
        "/* Файл создан scripts/subset_fonts.py — вручную не редактировать. */\n"
        "/* Шрифты урезаны до знаков, которые есть на сайте. Лицензия шрифтов — SIL OFL 1.1. */\n"
    ]
    for family, params, filename, css_family, charset in FONTS:
        text = cjk if charset == "cjk" else tib
        if not text:
            continue
        query = urllib.parse.urlencode({"family": family + params, "text": text, "display": "swap"})
        css = fetch(f"https://fonts.googleapis.com/css2?{query}").decode()
        m = re.search(r"url\((https://[^)]+)\)", css)
        if not m:
            raise SystemExit(f"{family}: в ответе нет ссылки на шрифт")
        data = fetch(m.group(1))
        with open(os.path.join(OUT_FONTS, filename), "wb") as fh:
            fh.write(data)
        weight = "500" if "wght@500" in params else "400"
        css_parts.append(
            "@font-face {\n"
            f"  font-family: '{css_family}';\n"
            f"  src: url('../assets/fonts/{filename}') format('woff2');\n"
            f"  font-weight: {weight};\n"
            "  font-style: normal;\n"
            "  font-display: swap;\n"
            "}\n"
        )
        print(f"{family:14s} -> {filename}: {len(data) / 1024:.1f} KB")
    with open(OUT_CSS, "w", encoding="utf-8") as fh:
        fh.write("\n".join(css_parts))
    print(f"-> {os.path.relpath(OUT_CSS, ROOT)}")


if __name__ == "__main__":
    main()

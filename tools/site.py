#!/usr/bin/env python3
"""Build and validate the dependency-free Mental Models site."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "concepts.json"
CONTENT = ROOT / "content"


def text(value):
    """Escape text-node content without rewriting harmless quotes."""
    return html.escape(value, quote=False)


def concepts():
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def assets(items, kind):
    if kind == "style":
        return "\n".join(f'  <link rel="stylesheet" href="../assets/{html.escape(item)}">' for item in items)
    return "\n".join(f'  <script src="../assets/{html.escape(item)}"></script>' for item in items)


def header(concept, by_slug):
    parent = concept.get("parent")
    href = f"{parent}.html" if parent else "../index.html"
    label = by_slug[parent]["title"] if parent else "Home"
    title = concept.get("heading_html", text(concept.get("heading", concept["title"])))
    common = (
        f'    <a class="back" href="{href}">← {text(label)}</a>\n'
        f'    <div class="eyebrow">{text(concept["eyebrow"])}</div>\n'
        f'    <h1>{title}</h1>\n'
        f'    <p class="subtitle">{text(concept["subtitle"])}</p>'
    )
    if concept.get("layout") == "lab":
        return (
            '    <header class="lab-header">\n      <div>\n'
            + "\n".join("  " + line for line in common.splitlines())
            + '\n      </div>\n      <div class="epoch-badge">Epoch <strong id="epochValue">1</strong></div>\n    </header>'
        )
    return common


def render_page(concept, fragment, by_slug):
    extra_styles = assets(concept.get("styles", []), "style")
    scripts = assets(concept.get("scripts", []), "script")
    body_attr = f' class="{concept["body_class"]}"' if concept.get("body_class") else ""
    main_class = concept.get("main_class", "page")
    document_title = concept.get("document_title", concept["title"])
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{text(document_title)} — Mental Models</title>
  <link rel="stylesheet" href="../assets/styles.css">{chr(10) + extra_styles if extra_styles else ""}
</head>
<body{body_attr}>
  <main class="{main_class}">
{header(concept, by_slug)}
{fragment.rstrip()}
  </main>{chr(10) + scripts if scripts else ""}
</body>
</html>
'''


def render_index(items):
    cards = []
    for item in items:
        if not item.get("home"):
            continue
        summary = item.get("home_summary", item["subtitle"])
        cards.append(f'''      <a class="concept-card" href="concepts/{item['slug']}.html">
        <div class="icon">{text(item['icon'])}</div>
        <div><h3>{text(item['title'])}</h3><p>{text(summary)}</p></div>
      </a>''')
    return '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mental Models</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="eyebrow">Visual knowledge base</div>
      <h1>Mental Models</h1>
      <p class="subtitle">Big ideas → small ideas → examples.</p>
    </section>
    <h2>Main concepts</h2>
    <section class="grid">
''' + "\n".join(cards) + '''
    </section>
  </main>
</body>
</html>
'''


def build(items):
    by_slug = {item["slug"]: item for item in items}
    for item in items:
        fragment_path = CONTENT / f"{item['slug']}.html"
        fragment = fragment_path.read_text(encoding="utf-8")
        output = render_page(item, fragment, by_slug)
        (ROOT / "concepts" / f"{item['slug']}.html").write_text(output, encoding="utf-8")
    (ROOT / "index.html").write_text(render_index(items), encoding="utf-8")


def validate(items):
    errors = []
    slugs = [item["slug"] for item in items]
    if len(slugs) != len(set(slugs)):
        errors.append("registry contains duplicate slugs")
    known = set(slugs)
    by_slug = {item["slug"]: item for item in items}
    for item in items:
        parent = item.get("parent")
        if parent and parent not in known:
            errors.append(f"{item['slug']}: unknown parent {parent}")
        for asset in item.get("styles", []) + item.get("scripts", []):
            if not (ROOT / "assets" / asset).is_file():
                errors.append(f"{item['slug']}: missing asset {asset}")
        if not (CONTENT / f"{item['slug']}.html").is_file():
            errors.append(f"{item['slug']}: missing content fragment")
        else:
            fragment = (CONTENT / f"{item['slug']}.html").read_text(encoding="utf-8")
            output = ROOT / "concepts" / f"{item['slug']}.html"
            if not output.is_file() or output.read_text(encoding="utf-8") != render_page(item, fragment, by_slug):
                errors.append(f"{item['slug']}: generated page is stale; run tools/site.py build")
    if (ROOT / "index.html").read_text(encoding="utf-8") != render_index(items):
        errors.append("index.html is stale; run tools/site.py build")
    for page in [ROOT / "index.html", *(ROOT / "concepts").glob("*.html")]:
        source = page.read_text(encoding="utf-8")
        for href in re.findall(r'href="([^"]+\.html)"', source):
            target = (page.parent / href).resolve()
            if not target.is_file():
                errors.append(f"{page.relative_to(ROOT)}: broken link {href}")
    if errors:
        print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
        return 1
    print(f"Validated {len(items)} concepts and all local HTML links.")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("build", "check"))
    args = parser.parse_args()
    items = concepts()
    if args.command == "build":
        build(items)
    else:
        return validate(items)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

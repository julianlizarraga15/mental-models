# Mental Models

A mobile-friendly visual knowledge base for concepts discussed with ChatGPT.

## Structure

- `data/concepts.json` — canonical concept metadata and parent relationships
- `content/` — the unique body of each concept page
- `tools/site.py` — dependency-free site builder and validator
- `index.html` and `concepts/` — generated static pages for GitHub Pages
- `assets/styles.css` — shared visual style
- `assets/concepts/` — styles used by one concept only

## Editing

Edit concept metadata in `data/concepts.json` and page content in the matching
`content/<slug>.html` file. Then regenerate and validate the site:

```sh
python3 tools/site.py build
python3 tools/site.py check
```

Do not edit `index.html` or files under `concepts/` directly; the next build will
replace those generated files. The validator also reports stale output, unknown
parents, missing assets, duplicate slugs, and broken local HTML links.

## Workflow

When a concept is worth saving, say:

> add this to the mental-models repo

The goal is not to write perfect essays. The goal is to build small, visual, connected explanations that can be opened from a phone.

## GitHub Pages

To publish it:

1. Go to **Settings → Pages**.
2. Source: **Deploy from a branch**.
3. Branch: **main**.
4. Folder: **/root**.
5. Save.

Then GitHub will give you a URL for the site.

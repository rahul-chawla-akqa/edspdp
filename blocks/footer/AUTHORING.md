# Footer block authoring

The site footer is loaded from a dedicated content page (default path `/footer`, via page metadata `footer`). Authors maintain one **Footer Section** with a single **Footer** container block and child items.

## Setup on the footer page

1. Create or open the footer page (for example `/footer`).
2. Add a **Footer Section** (not the default Section type).
3. In section metadata, set **Background Image** and alt text (optional full-bleed background).
4. Insert one **Footer** block inside that section.

## Footer block children

Add these **eight** child items to the Footer block (Content Tree order matters for navigation columns):

| Order | Child item | What to author |
|------:|------------|----------------|
| 1–5 | **Footer Nav Column** (five instances) | Column heading; use **Links** multifield to add/remove text links only |
| 6 | **Footer Logo** | Logo image, alt, optional home link |
| 7 | **Footer Legal** | Copyright line; Privacy, Terms, and Cookie links |
| 8 | **Footer Social** | Facebook, X, Instagram, LinkedIn, YouTube URLs (empty hides that network) |

**Navigation columns:** the first Footer Nav Column child maps to grid column 1, the second to column 2, and so on. Authors can add or remove links inside each column; they should not add a sixth Footer Nav Column if the layout must stay five columns wide.

**Item Type field:** every child item has an `Item Type` dropdown with a single value, prefilled from the item template. It is what the block reads to tell the items apart on preview and live, where authoring attributes are absent. Leave it as it is.

**Social networks** are matched by URL, so leaving one platform empty does not shift the others.

## After changing the models

Universal Editor reads `component-definition.json`, `component-models.json`, and `component-filters.json` from the branch, so run `npm run build:json` and push before the new items appear in the editor. A page already open in Universal Editor needs a reload to pick them up.

## Page metadata

Every page that should show this footer needs metadata pointing at the footer document, for example:

| Key | Value |
|-----|--------|
| `footer` | `/footer` |

## Local static preview

For local AEM CLI testing without CMS content, use [`drafts/footer.plain.html`](../drafts/footer.plain.html) with `--html-folder drafts` and the same child row structure as Universal Editor delivers.

## Models

- Block and child definitions: [`_footer.json`](_footer.json)
- Footer section (background only): [`models/_footer-section.json`](../models/_footer-section.json)

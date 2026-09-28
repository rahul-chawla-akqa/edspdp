# Footer block authoring

The site footer is loaded from a dedicated content page (default path `/footer`, via page metadata `footer`). Authors maintain one **Footer Section** with a single **Footer** container block and child items.

## Setup on the footer page

1. Create or open the footer page (for example `/footer`).
2. Add a **Footer Section** (recommended; supports background image in section metadata) **or** a default **Section**.
3. For **Footer Section**, set **Background Image** and alt text in section metadata.
4. Insert one **Footer** block inside that section.

The **Footer** block appears in the block list when the active section uses the default section filter or the **Footer Section** filter. **Footer Nav Column**, **Footer Logo**, and other child types only appear when inserting into an existing **Footer** block, not at section level.

## Footer block children

Add these **eight** child items to the Footer block (Content Tree order matters for navigation columns):

| Order | Child item | What to author |
|------:|------------|----------------|
| 1–5 | **Footer Nav Column** (five instances) | Column heading; use **Links** multifield to add/remove text links only |
| 6 | **Footer Logo** | Logo image, alt, optional home link |
| 7 | **Footer Legal** | Copyright line; Privacy, Terms, and Cookie links |
| 8 | **Footer Social** | Facebook, X, Instagram, LinkedIn, YouTube URLs (empty hides that network) |

**Navigation columns:** the first Footer Nav Column child maps to grid column 1, the second to column 2, and so on. Authors can add or remove links inside each column; they should not add a sixth Footer Nav Column if the layout must stay five columns wide.

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

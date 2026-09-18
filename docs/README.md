# Documentation

## Current architecture

| Document | Read it for |
|----------|-------------|
| [ssr-overlay-architecture.md](ssr-overlay-architecture.md) | How server-side composition works here, and how to deploy, wire up and operate it |
| [page-type-playbook.md](page-type-playbook.md) | Applying the pattern to other page types: decision tree, recipes, checklist |
| [pdp-data-flow.pdf](pdp-data-flow.pdf) / [pdp-data-flow.png](pdp-data-flow.png) | PDP flow diagram: when compose runs, visitor requests, and where data is stored |
| [posts-data-flow.pdf](posts-data-flow.pdf) / [posts-data-flow.png](posts-data-flow.png) | Post flow diagram: CDN cache, edge-function stitch on miss, and where data is stored |

Start with the architecture document, then the playbook.

## Background references

These predate the current architecture and were written for a different site (`akqaedsrc`).
Each carries a scope note explaining what still applies.

| Document | Status |
|----------|--------|
| [overlay-api-reference.md](overlay-api-reference.md) | Admin API mechanics still accurate; project values are for the old site |
| [JSON2HTML-SETUP.md](JSON2HTML-SETUP.md) | Accurate for the whole-page pattern (playbook Recipe D); not how this site's PDPs work |
| [AEM_EDS_BYOM_Overlay_Blueprint.md](AEM_EDS_BYOM_Overlay_Blueprint.md) | Superseded, and contains two corrected errors about `fstab.yaml` and per-request invocation |

## Quick reference

```bash
npm run dev          # compose proxy on :4000 plus aem up on :3000
npm run test:ssr     # composition, block decoration and admin job tests
npm run lint
npm run build:json   # regenerate component model aggregates
npm run lighthouse          # Chrome Lighthouse CI (mobile) against local drafts
npm run lighthouse:desktop
npm run psi                 # PageSpeed Insights against a preview URL

npm run ssr:deploy               # deploy the composer to Adobe I/O Runtime
npm run ssr:wire -- check        # inspect the site config and overlay
npm run ssr:wire -- preview /products/1
npm run eds:publish-product-json -- --ids 1 2 3
npm run eds:publish-product-json -- --catalog --limit 30 --dry-run
```

## Performance checks

Chrome DevTools Lighthouse, `npm run lighthouse`, and PageSpeed Insights all run the same Lighthouse engine (Performance, Accessibility, Best Practices, technical SEO). Scores are lab results, not field Core Web Vitals.

| Command | Engine | Typical target |
|---------|--------|----------------|
| `npm run lighthouse` / `lighthouse:desktop` | Local Chrome via Lighthouse CI | `http://localhost:3002` drafts (or `LIGHTHOUSE_BASE_URL`) |
| `npm run psi` | Google PageSpeed Insights API | `https://{branch}--edspdp--{owner}.aem.page` |
| Pull request **PageSpeed Insights** workflow | Same PSI API | Feature preview `/` and `/products/1`, mobile + desktop |

Local Lighthouse HTML reports land in `lighthouse-reports/`. PSI writes JSON plus a markdown summary to `psi-reports/`.

```bash
# Local Chrome (starts aem-cli on :3002 unless a server is already up)
npm run lighthouse
LIGHTHOUSE_BASE_URL=http://localhost:3000 npm run lighthouse
LIGHTHOUSE_URLS=/,/products/1 LIGHTHOUSE_BASE_URL=http://localhost:3000 npm run lighthouse

# Same lab as the PR check (needs a Google PSI API key for reliable quota)
PSI_API_KEY=... PSI_BASE_URL=https://main--edspdp--rahul-chawla-akqa.aem.page \
  PSI_PATHS=/,/products/1 npm run psi
```

The GitHub Action comments the score table on the PR, uploads `psi-reports/`, and **fails if any category is below 90**. Skip it with the `ignore-psi-check` label. Store the key as repo secret `PSI_API_KEY` ([PSI API](https://developers.google.com/speed/docs/insights/v5/get-started)). This does not replace Adobe Code Sync’s PSI bot; it adds a report and a 90 budget even when that bot is missing or stricter.

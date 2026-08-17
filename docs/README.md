# Documentation

## Current architecture

| Document | Read it for |
|----------|-------------|
| [ssr-overlay-architecture.md](ssr-overlay-architecture.md) | How server-side composition works here, and how to deploy, wire up and operate it |
| [page-type-playbook.md](page-type-playbook.md) | Applying the pattern to other page types: decision tree, recipes, checklist |

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

npm run ssr:deploy               # deploy the composer to Adobe I/O Runtime
npm run ssr:wire -- check        # inspect the site config and overlay
npm run ssr:wire -- preview /products/1
```

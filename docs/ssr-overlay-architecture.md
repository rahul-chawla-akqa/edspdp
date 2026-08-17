# Server-Side Composition via BYOM Overlay

How this site serves product detail pages whose content comes primarily from AEM, with parts
supplied by an external API and merged **server-side**.

For applying the pattern to other page types, see
[page-type-playbook.md](page-type-playbook.md).

## Project details

| Field | Value |
|-------|-------|
| Org | `rahul-chawla-akqa` |
| Site | `edspdp` |
| Branch | `main` |
| Primary content source | `https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/edspdp/main` |
| Overlay (composer) | `https://<namespace>.adobeioruntime.net/api/v1/web/edspdp-ssr/compose` |
| Preview | `https://main--edspdp--rahul-chawla-akqa.aem.page/` |
| Live | `https://main--edspdp--rahul-chawla-akqa.aem.live/` |

---

## 1. Why a composer exists at all

Two facts about BYOM overlays, from [aem.live/developer/byom](https://www.aem.live/developer/byom),
determine the design:

1. **An overlay returns a whole page, not a fragment.** A `200` means "this HTML *is* the
   page"; `404`, `401` or `403` fall back to the primary source. There is no built-in "merge
   this fragment into the authored page" mode.
2. **The overlay is consulted at preview/publish time**, not per request. The Admin API
   ingests the response into the content bus and the CDN serves it statically.

So "AEM primary + API data replacing a placeholder block" cannot be expressed by
configuration alone. It needs a service that fetches the authored page *itself*, splices the
API markup in, and returns the combined document. That service is the composer.

Consequence to internalise: **composed data is a snapshot taken at publish time.** See
[the playbook](page-type-playbook.md#1-the-one-thing-to-understand-first).

---

## 2. Request flow

```mermaid
sequenceDiagram
    participant Admin as AEM Admin API
    participant Action as compose action
    participant AEM as AEM Author
    participant API as External API
    participant CDN as CDN / visitor

    Admin->>Action: GET /products/1 (overlay checked first)
    Note over Action: route match; no match -> 404, zero network calls
    Action->>AEM: GET /products/1.html (forwards credential)
    AEM-->>Action: authored page markup
    Note over Action: find placeholder blocks, resolve product key
    Action->>API: GET /products/1
    API-->>Action: JSON
    Note over Action: render rows, splice into blocks, inject SEO
    Action-->>Admin: 200 merged HTML
    Admin->>Admin: ingest into content bus
    Admin->>CDN: publish
    CDN-->>CDN: static HTML, no client data fetch on the critical path
```

---

## 3. Layout

```
blocks/
  product-specs/     placeholder block: model, decoration, CSS
  product-gallery/
  product-reviews/
scripts/
  product-data.js    client-side key resolution, request cache, hydration
  renderers/         markup renderers shared by server and browser
ssr/
  src/
    compose.js       pure composition; all I/O injected
    routes.js        route table and path normalization
    http.js          timeout-bounded fetchers, credential resolution
    admin.js         bulk preview/publish with job polling
  actions/
    compose/         the overlay web action
    refresh/         webhook that re-publishes changed pages
  scripts/
    wire-overlay.mjs      site config, overlay registration, preview/publish
    refresh-composed.mjs  scheduled full refresh
  test/              36 tests over composition, decoration and admin jobs
dev/
  compose-server.mjs local harness running the same compose()
drafts/              stand-in authored pages for local development
```

`ssr/`, `dev/` and `drafts/` are in `.hlxignore` and never served. `scripts/renderers/` is
**not** ignored: the browser imports those modules for client-side hydration.

---

## 4. Design decisions worth knowing

**One renderer implementation, two runtimes.** Renderers are pure functions returning HTML
strings, imported by both the Node composer and the browser blocks. There is no second copy of
the markup to keep in sync.

**Renderers emit pre-decoration rows.** The composer writes the same row markup an author
would have produced, then the block's `decorate()` runs in the browser as normal. Server-
composed and client-hydrated pages therefore end up with identical DOM.

**`compose()` is pure.** It takes `fetchPrimary` and `fetchData` as arguments, so the same
function backs the deployed action, the local dev server and the tests.

**Every failure is a 404.** Identical to having no overlay configured — which is what makes
enabling the overlay site-wide safe. See
[the failure table](page-type-playbook.md#6-failure-behaviour).

**Volatile fields are excluded on purpose.** Price and stock are absent from the composed
specs, with a test asserting it. A stale price is worse than a late one.

**Meta tags are rebuilt, not mutated.** `node-html-parser`'s `setAttribute` escapes only
double quotes, leaving a raw `&` or `<` from API data in the attribute. The composer builds
meta tags from an escaped string instead. There is a regression test for a brand name
containing an ampersand.

**JSON-LD is escaped against breakout.** `<` becomes `\u003c` so a value containing
`</script>` cannot terminate the element early.

---

## 5. Local development

```bash
npm run dev     # compose proxy on :4000 plus aem up on :3000
```

Then open `http://localhost:3000/products/1`.

`aem up` alone serves pages already ingested into the preview content bus, so it cannot
exercise composition. The proxy sits in front of it as the content origin and runs the same
`compose()` the deployed action runs, so composition bugs surface locally.

Content resolution order in the proxy:

1. A real repo file (`head.html`, `404.html`) — served from disk.
2. A file in `drafts/` — stands in for an authored page, so composition can be developed
   before any AEM page exists.
3. AEM Author, if `AEM_TOKEN` is set in `.env.local`.
4. Otherwise the public preview origin, which needs no credentials.

```bash
npm run test:ssr    # 36 tests, no network access required
npm run lint
```

---

## 6. Deploying

### 6.1 Deploy the composer

```bash
cd ssr
cp .env.example .env      # fill in AIO_runtime_auth and AIO_runtime_namespace
npm install
npm run deploy
```

Note the returned web action URL; it becomes the overlay URL.

### 6.2 Migrate to the configuration service

**Overlays cannot be configured in `fstab.yaml`** — the configuration service is required. The
mountpoint currently in [fstab.yaml](../fstab.yaml) has to move into a site config.

Get a Sidekick token (an `aio` CLI or AEM Dev Console token will not work here) by logging in
at `https://admin.hlx.page/login/rahul-chawla-akqa/edspdp/main`, then:

```bash
export AEM_ADMIN_TOKEN="<sidekick-token>"

npm run ssr:wire -- check     # what is configured today
npm run ssr:wire -- init      # first-time site config; 409 means one already exists
npm run ssr:wire -- set-overlay "https://<namespace>.adobeioruntime.net/api/v1/web/edspdp-ssr/compose"
npm run ssr:wire -- check     # confirm the overlay is registered
```

The overlay is registered **without a suffix**: the composer normalizes paths itself and adds
the primary source's `.html` when it fetches the authored page.

### 6.3 Preview and verify

```bash
npm run ssr:wire -- preview /products/1
curl -s https://main--edspdp--rahul-chawla-akqa.aem.page/products/1 | grep api-rendered
npm run ssr:wire -- publish /products/1
```

### 6.4 Roll back

```bash
npm run ssr:wire -- remove-overlay
```

Pages already ingested keep their composed content until re-previewed.

---

## 7. Authoring

1. Set the page's **Product ID** in page properties (optional — the last URL segment is used
   by default).
2. Add **Product Gallery**, **Product Specs** and **Product Reviews** blocks wherever they
   belong on the page.
3. Leave each block's *Product ID override* empty unless that block must show a different
   product.

In Universal Editor the blocks fetch the API directly and render client-side, so authors see
real content while editing. On a published page the server has already filled them and the
client-side path does not run.

---

## 8. Operational notes

- The site config is **site-level, not branch-level**, so registering the overlay affects all
  branches. Instant-404 route gating is what makes that safe.
- The composer's `FETCH_TIMEOUT_MS` (default 2000) bounds both upstream calls. The Admin API
  waits on the composer during publish, so failing fast matters more than succeeding slowly.
- Images referenced in composed markup are downloaded into the media bus at preview time, so
  API-hosted images get optimised delivery for free — but they must be publicly reachable at
  that moment.
- The refresh action polls asynchronous bulk jobs; its `JOB_TIMEOUT_MS` must stay below the
  action `timeout` in [ssr/app.config.yaml](../ssr/app.config.yaml).

---

## 9. Reference

- [Bring Your Own Markup](https://www.aem.live/developer/byom)
- [JSON2HTML](https://www.aem.live/developer/json2html)
- [Configuration Service Setup](https://www.aem.live/docs/config-service-setup)
- [Admin API](https://www.aem.live/docs/admin.html)
- [Keeping it 100](https://www.aem.live/developer/keeping-it-100)

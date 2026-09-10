# Edge-stitched post pages (Adobe CDN / Fastly)

Post pages (`/posts/post-1`, `/posts/post-2`, …) are authored in AEM as placeholder
markup only. An [AEM Edge Function](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/edge-functions)
on Adobe Managed CDN (Fastly Compute) fetches that HTML, fills the `post-body` block from
[JSONPlaceholder](https://jsonplaceholder.typicode.com/posts/1), and returns the combined
document. The **CDN caches that response**, so later visitors are not sent through the
function until the TTL expires or the cache is purged.

This is not the App Builder BYOM overlay. Product pages still compose at preview/publish
via [ssr-overlay-architecture.md](ssr-overlay-architecture.md). Stitched posts are served
only on the **custom domain** mapped in Cloud Manager, not on `*.aem.live` / `*.aem.page`.

---

## 0. Deploy gate: custom domain

Edge Functions on Edge Delivery Services [require a custom hostname](https://experienceleague.adobe.com/en/docs/experience-manager-learn/cloud-service/edge-functions/edge-functions-setup/setup-eds)
on Adobe Managed CDN. Until this is done, `aio aem edge-functions deploy` cannot receive
live traffic (the `edgefunction-p…-d….adobeaemcloud.com` host is debug-only).

In Cloud Manager, on the existing EDS site:

1. **Add domain** — the public hostname visitors will use.
2. **SSL** — Adobe-managed DV is enough for a proof of concept; customer OV/EV also works.
3. **DNS** — create the CNAME (or ALIAS) Cloud Manager shows, pointing at Adobe CDN.
4. **Map** the domain to this EDS origin (`https://main--edspdp--rahul-chawla-akqa.aem.live/`).
5. Confirm `https://<your-domain>/` serves this site.

Then authenticate and bind the CLI to that site:

```bash
npm install -g @adobe/aio-cli
aio plugins install @adobe/aio-cli-plugin-aem-edge-functions
aio login
aio aem edge-functions setup
aio aem edge-functions info
```

Replace `www.example.com` in [edge/config/cdn.yaml](../edge/config/cdn.yaml) with the
hostname from step 1 before running the configuration pipeline. Leave that condition in
place so only the mapped site domain is stitched; `*.aem.live` stays authored HTML.

---

## Request flow

```
Browser → Adobe CDN cache → Edge Function (cache miss only)
                              ├─ loopback GET /posts/post-N  (sentinel header)
                              │     → EDS origin (authored HTML)
                              └─ GET jsonplaceholder /posts/N
                           ← stitched HTML + Cache-Control / Surrogate-Key
```

`skipCache` is **false** on the origin selector. A cached document never invokes Fastly.

The loopback request sets `x-edgefunction-request: true`. `cdn.yaml` ignores requests that
already carry that header so the function cannot recurse into itself.

---

## What lives where

| Path | Role |
|------|------|
| `blocks/post-body/` | Placeholder block: model, CSS, decoration |
| `scripts/renderers/post-body.js` | Pre-decoration rows from API JSON (browser + Fastly) |
| `scripts/post-data.js` | Client hydrate when the edge function did not run |
| `drafts/posts/` | Local HTML for `aem up --html-folder drafts` |
| `edge/` | Fastly Compute project and Cloud Manager CDN config |

EDS stores no API fields. The overlay is not registered for `/posts/*`.

---

## Deploy

Cloud Manager **Edge Delivery configuration pipeline**, code location **`edge/config`**,
deploys `edgeFunctions.yaml` and `cdn.yaml`.

Function wasm (Deployment Manager role):

```bash
cd edge
npm install
aio aem edge-functions build
aio aem edge-functions deploy posts-composer
```

Local Fastly runtime (port 7676), with EDS HTML from live or from `aem up`:

```bash
cd edge
# fastly.toml EDS_ORIGIN should be http://127.0.0.1:3000 while aem up is running
aio aem edge-functions serve
curl -i http://127.0.0.1:7676/posts/post-1
```

Restart `aio aem edge-functions serve` after editing `edge/src`; the local wasm is not hot-reloaded.

Without the custom domain, `aem up --html-folder drafts` serves
`/drafts/posts/post-1` and `/drafts/posts/post-2`. The `post-body` block hydrates in
the browser from JSONPlaceholder on those paths. Stitched HTML (no client fetch) only
appears on the mapped custom domain after the edge function is deployed.

---

## Caching and purge

Two independent layers ([Adobe caching docs](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/edge-functions-caching)):

| Layer | What it stores | TTL (PoC) | How to invalidate |
|-------|----------------|-----------|-------------------|
| **CDN cache** (outer) | Stitched HTML the browser receives | `Surrogate-Control: max-age=3600` | CDN Cache Purge API, keys below |
| **Fetch cache** (inner) | EDS HTML and JSONPlaceholder responses | backend / `CacheOverride` | `aio aem edge-functions purge-cache` |

Response headers set by the function:

- `Cache-Control: public, max-age=60` (browser)
- `Surrogate-Control: max-age=3600` (CDN)
- `Surrogate-Key: posts post-<id>` (space-separated)

After an AEM republish of a post page, or if API data changed, **purge both layers**.
Purging only the CDN lets the next miss restitch from a stale fetch cache. Purging only
the fetch cache leaves the CDN serving the previous HTML until TTL.

```bash
# Inner fetch cache (EDS + API responses tagged in the function)
aio aem edge-functions purge-cache posts-composer --surrogateKey post-1
aio aem edge-functions purge-cache posts-composer --surrogateKey posts

# Soft purge keeps stale entries for revalidation
aio aem edge-functions purge-cache posts-composer --surrogateKey post-1 --soft
```

Outer CDN: use the [AEM CDN Cache Purge API](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/content-delivery/cdn-cache-purge)
with the same surrogate keys (`post-1`, `posts`) that the function set on the response.

JSONPlaceholder payloads do not change; a one-hour CDN TTL is enough for this PoC.

---

## Failure behaviour

| Situation | Response |
|-----------|----------|
| Path is not `/posts/post-N` | Pass through EDS HTML unchanged |
| EDS origin is not 200 | Forward that status; do not invent HTML |
| API error, timeout, or empty body | Return EDS HTML as-is (placeholder). Client hydrate in `post-body.js` may still fill the block |
| Unexpected exception | 502 with a short message |

On `*.aem.live` / Universal Editor the function never runs; the block hydrates in the browser.

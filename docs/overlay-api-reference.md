# AEM EDS Content Overlay API Reference

This documents the overlay content configuration — how to register an overlay source in the
site config, preview/publish overlay pages, and the lookup order the Admin API follows.

For json2html worker configuration (mappings, config fields, templates, blogs, local dev),
see [JSON2HTML-SETUP.md](JSON2HTML-SETUP.md).

> **Scope note.** The Admin API mechanics here — registering an overlay source, the lookup
> order, preview/publish — apply unchanged to this project. Only the **project values differ**:
> the tables below are for the earlier `akqaedsrc` site with a json2html overlay, whereas this
> project is `edspdp` with the composer described in
> [ssr-overlay-architecture.md](ssr-overlay-architecture.md).
>
> For `edspdp`, prefer the scripted equivalents, which carry the right values and wait for
> asynchronous bulk jobs to finish instead of trusting a `202`:
>
> ```bash
> npm run ssr:wire -- check
> npm run ssr:wire -- set-overlay <composer-url>
> npm run ssr:wire -- preview /products/1
> ```

## Project Details

| Field | Value |
|-------|-------|
| **Org** | `rahul-chawla-akqa` |
| **Site** | `akqaedsrc` |
| **Branch** | `main` |
| **GitHub Repo** | `https://github.com/rahul-chawla-akqa/akqaedsrc` |
| **Primary Content Source** | `https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main` |
| **Overlay Source (json2html)** | `https://json2html.adobeaem.workers.dev/rahul-chawla-akqa/akqaedsrc/main` |
| **Preview URL** | `https://main--akqaedsrc--rahul-chawla-akqa.aem.page/` |
| **Live URL** | `https://main--akqaedsrc--rahul-chawla-akqa.aem.live/` |

---

## Authentication

All API calls require an Adobe IMS access token. Pass it via the `Authorization` header:

```
Authorization: Bearer <IMS_ACCESS_TOKEN>
```

Tokens expire after 24 hours. Generate a new one from the Adobe Developer Console or via `aio login`.
See [JSON2HTML-SETUP.md](JSON2HTML-SETUP.md#authentication--token-generation) for detailed token generation steps.

---

## 1. Site Configuration Service API

**Base URL:** `https://admin.hlx.page/config/{org}/sites/{site}`

### 1.1 GET Full Site Config

Retrieve the complete site configuration.

```bash
curl -X GET https://admin.hlx.page/config/rahul-chawla-akqa/sites/akqaedsrc.json \
  -H "Authorization: Bearer $TOKEN"
```

**Current live response (v9):**

```json
{
  "version": 9,
  "code": {
    "source": {
      "type": "github",
      "url": "https://github.com/rahul-chawla-akqa/akqaedsrc"
    },
    "owner": "rahul-chawla-akqa",
    "repo": "akqaedsrc"
  },
  "content": {
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    },
    "overlay": {
      "url": "https://json2html.adobeaem.workers.dev/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup"
    }
  },
  "access": {
    "admin": {
      "role": { "admin": ["rahul.chawla@akqa.com"] },
      "requireAuth": "false"
    }
  }
}
```

### 1.2 PUT Create Site Config (First-Time Setup)

Creates a new site configuration. Fails with `409 Conflict` if one already exists.

```bash
curl -X PUT https://admin.hlx.page/config/rahul-chawla-akqa/sites/akqaedsrc.json \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  --data '{
  "version": 1,
  "code": {
    "owner": "rahul-chawla-akqa",
    "repo": "akqaedsrc"
  },
  "content": {
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    }
  }
}'
```

### 1.3 POST Update Content Config (Add/Edit Overlay)

Updates only the content section of the site config. Use this to add or modify the overlay.

**Endpoint:** `POST https://admin.hlx.page/config/{org}/sites/{site}/content.json`

```bash
curl -X POST https://admin.hlx.page/config/rahul-chawla-akqa/sites/akqaedsrc/content.json \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  --data '{
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    },
    "overlay": {
      "url": "https://json2html.adobeaem.workers.dev/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup"
    }
  }'
```

**Content Config Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `source.url` | string | Primary content source URL |
| `source.type` | string | Must be `"markup"` for BYOM sources |
| `source.suffix` | string | Optional suffix appended to paths (e.g., `".html"`) |
| `overlay.url` | string | Overlay BYOM endpoint URL |
| `overlay.type` | string | Must be `"markup"` |
### 1.3.1 Add Posts Overlay (App Builder Worker)

Register the App Builder worker as the overlay source for posts URLs with dynamic
locale/language prefixes (e.g., `/us/en/posts`, `/fr/fr/posts/1`).

The Admin API overlay schema only accepts `type`, `url`, and optional `suffix`.
Path routing is handled by the **worker itself** — it returns `200` with HTML for
matched paths and `404` to fall through to the primary content source.

```bash
curl -X POST https://admin.hlx.page/config/rahul-chawla-akqa/sites/akqaedsrc/content.json \
  -H 'content-type: application/json' \
  -H "x-auth-token: $TOKEN" \
  --data '{
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    },
    "overlay": {
      "url": "https://257490-akqaeds-stage.adobeio-static.net/api/v1/web/my-eds-worker/json2html-processor",
      "type": "markup"
    }
  }'
```

> **Note:** The `$TOKEN` must be a Sidekick auth token (obtained via browser login at
> `https://admin.hlx.page/login/{org}/{site}/{ref}`), not an `aio` CLI or AEM Dev Console
> token. Use the `x-auth-token` header, not `Authorization: Bearer`.

**Locale-aware path matching** is handled by the worker. When the Admin API receives a
request for `/us/en/posts/1`, it forwards the full path to the overlay URL. The worker
strips the locale prefix, matches against its `/posts` mappings, and returns the
rendered HTML or `404`.

### 1.4 POST Remove Overlay

To remove the overlay, POST the content config without the overlay field:

```bash
curl -X POST https://admin.hlx.page/config/rahul-chawla-akqa/sites/akqaedsrc/content.json \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  --data '{
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    }
  }'
```

---

## 2. Preview / Publish API

### 2.1 Preview a Page

Triggers the overlay lookup and ingests the content into the preview content bus.

```bash
curl -X POST "https://admin.hlx.page/preview/rahul-chawla-akqa/akqaedsrc/main/products/1" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.2 Publish a Page (Go Live)

Promotes the previewed content to the live CDN.

```bash
curl -X POST "https://admin.hlx.page/live/rahul-chawla-akqa/akqaedsrc/main/products/1" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.3 Check Page Status

```bash
curl "https://admin.hlx.page/status/rahul-chawla-akqa/akqaedsrc/main/products/1" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.4 Delete a Previewed/Published Page

```bash
curl -X DELETE "https://admin.hlx.page/preview/rahul-chawla-akqa/akqaedsrc/main/products/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Overlay Lookup Order

When a preview/publish request is made:

1. Admin API checks the **overlay source** first (json2html worker)
2. If overlay returns `200` — that HTML is ingested as the page
3. If overlay returns `404`, `401`, or `403` — falls back to the **primary content source** (AEM Author)
4. If primary source also returns `404` — the page is not found

---

## 4. Current Active Site Configuration

### Site Config (version 9)

```json
{
  "content": {
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    },
    "overlay": {
      "url": "https://json2html.adobeaem.workers.dev/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup"
    }
  }
}
```

### Site Config with Posts Overlay (App Builder Worker, version 10)

After applying the posts overlay configuration from §1.3.1:

```json
{
  "content": {
    "source": {
      "url": "https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/akqaedsrc/main",
      "type": "markup",
      "suffix": ".html"
    },
    "overlay": {
      "url": "https://257490-akqaeds-stage.adobeio-static.net/api/v1/web/my-eds-worker/json2html-processor",
      "type": "markup"
    }
  }
}
```

---

## 5. Key Documentation Links

- [BYOM (Bring Your Own Markup)](https://www.aem.live/developer/byom)
- [Configuration Service Setup](https://www.aem.live/docs/config-service-setup)
- [Content Fragment Overlay](https://www.aem.live/developer/content-fragment-overlay)
- [AEM Admin API](https://www.aem.live/docs/admin.html)
- [BYOM Demo Repo (App Builder)](https://github.com/larsauffarth/byom-demo)

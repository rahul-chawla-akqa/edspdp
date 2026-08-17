# JSON2HTML Service Setup & Configuration

This documents how to configure the JSON2HTML worker service — the Cloudflare Worker that
converts JSON API responses into EDS-compatible HTML using Mustache templates.

For overlay and site configuration (adding/removing the overlay source, preview/publish APIs,
lookup order), see [overlay-api-reference.md](overlay-api-reference.md).

> **Scope note.** This describes the **whole-page** pattern, where the API is the entire
> source and no AEM page exists — Recipe D in
> [page-type-playbook.md](page-type-playbook.md#recipe-d--pages-with-no-authored-content). It
> is *not* how this site's product pages work: those keep AEM as the primary source and merge
> API data into placeholder blocks, which json2html cannot express. See
> [ssr-overlay-architecture.md](ssr-overlay-architecture.md).
>
> The values below are from the earlier `akqaedsrc` site, not this `edspdp` project. Only one
> overlay can be registered per site, so json2html and this project's composer cannot both be
> active on `edspdp`.

## Project Details

| Field | Value |
|-------|-------|
| **Org** | `rahul-chawla-akqa` |
| **Site** | `akqaedsrc` |
| **Branch** | `main` |
| **GitHub Repo** | `https://github.com/rahul-chawla-akqa/akqaedsrc` |
| **Preview URL** | `https://main--akqaedsrc--rahul-chawla-akqa.aem.page/` |
| **Live URL** | `https://main--akqaedsrc--rahul-chawla-akqa.aem.live/` |

---

## Authentication & Token Generation

All Admin API and JSON2HTML config calls require an Adobe IMS access token passed via:

```
Authorization: Bearer <IMS_ACCESS_TOKEN>
```

Tokens expire after **24 hours**. Store the token in `.env.local` as `AEM_TOKEN`.

### Method 1: AEM Developer Console (Recommended for quick access)

1. Open [Adobe Experience Cloud](https://experience.adobe.com/)
2. Navigate to **AEM as a Cloud Service** > **Developer Console**
   - Direct URL: `https://developer.adobe.com/console/projects`
   - Or via: AEM Author instance > **Tools** > **Cloud Services** > **Developer Console**
3. Select your environment: `p104103-e1884364`
4. Click **Integrations** > **Get Local Development Token**
5. Copy the generated token (valid for 24h)
6. Save it:

```bash
# .env.local
AEM_TOKEN="<paste-token-here>"
```

### Method 2: Adobe I/O CLI (`aio`)

1. Install the CLI (if not already):

```bash
npm install -g @adobe/aio-cli
```

2. Log in to Adobe IMS:

```bash
aio login
```

This opens a browser for OAuth authentication and stores the credentials locally.

3. Verify login:

```bash
aio auth context
```

4. Get the access token:

```bash
aio auth get-token
```

5. Save it to `.env.local`:

```bash
echo "AEM_TOKEN=\"$(aio auth get-token)\"" > .env.local
```

> **Tip**: You can create a shell alias to refresh in one step:
> ```bash
> alias refresh-token='echo "AEM_TOKEN=\"$(aio auth get-token)\"" > .env.local'
> ```

---

## Prerequisites

- A valid IMS access token (see above)
- Mustache templates committed and previewed in the repo (under `templates/`)

---

## 1. JSON2HTML Worker API

**Base URL:** `https://json2html.adobeaem.workers.dev`

### 1.1 GET — Read Current Mappings

```bash
curl -s -X GET "https://json2html.adobeaem.workers.dev/config/rahul-chawla-akqa/akqaedsrc/main" \
  -H "Authorization: Bearer $AEM_TOKEN"
```

**Current live response:**

```json
[
  {
    "path": "/products/",
    "endpoint": "https://dummyjson.com/products/{{id}}",
    "regex": "/[^/]+$/",
    "template": "/templates/products/detail.html"
  },
  {
    "path": "/products",
    "endpoint": "https://dummyjson.com/products",
    "template": "/templates/products/list.html"
  }
]
```

### 1.2 POST — Create/Update Mappings

**Endpoint:** `POST https://json2html.adobeaem.workers.dev/config/{org}/{site}/{branch}`

```bash
curl -X POST "https://json2html.adobeaem.workers.dev/config/rahul-chawla-akqa/akqaedsrc/main" \
  -H "Authorization: Bearer $AEM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "path": "/products/",
      "endpoint": "https://dummyjson.com/products/{{id}}",
      "regex": "/[^/]+$/",
      "template": "/templates/products/detail.html"
    },
    {
      "path": "/products",
      "endpoint": "https://dummyjson.com/products",
      "template": "/templates/products/list.html"
    }
  ]'
```

### 1.3 Config Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | URL path prefix to match incoming requests |
| `endpoint` | string | Yes | API endpoint URL. Use `{{id}}` as placeholder for the extracted ID |
| `regex` | string | No | Regex to extract an ID from the request URL |
| `template` | string | No | Path to a Mustache template file in the GitHub repo |
| `headers` | object | No | Custom HTTP headers to send when fetching from the endpoint |
| `forwardHeaders` | array | No | Headers from the admin API request to forward to the endpoint |
| `relativeURLPrefix` | string | No | Prefix for relative URLs in generated HTML (for images, videos, etc.) |
| `arrayKey` | string | No | Key in the JSON response containing an array to iterate |
| `pathKey` | string | No | Key in each array item used to match the requested path |
| `useAEMMapping` | boolean | No | Use AEM path mappings from `/config.json` to rewrite links |

### 1.4 Test Worker Directly (No Auth Required)

Fetch rendered HTML without going through the Admin API:

```bash
curl "https://json2html.adobeaem.workers.dev/rahul-chawla-akqa/akqaedsrc/main/products/1"
```

---

## 2. Posts (JSONPlaceholder API)

The `/posts` routes render data from the JSONPlaceholder API into EDS markup using
Mustache templates. URLs are locale-aware, matching `/{country}/{lang}/posts` patterns
where `country` and `lang` are two-letter codes (e.g., `us/en`, `fr/fr`, `de/de`).

### Endpoints

| Route | API URL | Template |
|-------|---------|----------|
| `/{country}/{lang}/posts` | `https://jsonplaceholder.typicode.com/posts` | `/templates/posts/list.html` |
| `/{country}/{lang}/posts/{id}` | `https://jsonplaceholder.typicode.com/posts/{id}` | `/templates/posts/detail.html` |

### JSON2HTML Mappings Configuration

The page path regex `/posts/*` matches any path ending in `/posts` or `/posts/{id}`,
regardless of locale prefix. The worker strips the locale prefix before matching.

```bash
curl -X POST "https://json2html.adobeaem.workers.dev/config/rahul-chawla-akqa/akqaedsrc/main" \
  -H "Authorization: Bearer $AEM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "path": "/products/",
      "endpoint": "https://dummyjson.com/products/{{id}}",
      "regex": "/[^/]+$/",
      "template": "/templates/products/detail.html"
    },
    {
      "path": "/products",
      "endpoint": "https://dummyjson.com/products",
      "template": "/templates/products/list.html"
    },
    {
      "path": "/posts/",
      "endpoint": "https://jsonplaceholder.typicode.com/posts/{{id}}",
      "regex": "/\\d+$",
      "template": "/templates/posts/detail.html"
    },
    {
      "path": "/posts",
      "endpoint": "https://jsonplaceholder.typicode.com/posts",
      "template": "/templates/posts/list.html"
    }
  ]'
```

### Mapping Fields for Posts

| Field | Value | Description |
|-------|-------|-------------|
| `path` | `/posts/` | Matches detail pages (trailing slash indicates sub-path) |
| `path` | `/posts` | Matches the list page (exact path, no trailing slash) |
| `endpoint` | `https://jsonplaceholder.typicode.com/posts/{{id}}` | Detail API with `{{id}}` placeholder |
| `endpoint` | `https://jsonplaceholder.typicode.com/posts` | List API returning all posts |
| `regex` | `/\\d+$` | Extracts the numeric post ID from the URL |
| `template` | `/templates/posts/detail.html` | Mustache template for single post |
| `template` | `/templates/posts/list.html` | Mustache template for post listing |

### App Builder Worker (Staging)

When using the App Builder worker instead of the Cloudflare json2html worker, the overlay
URL in the site config points to:

```
https://257490-akqaeds-stage.adobeio-static.net/api/v1/web/my-eds-worker/json2html-processor
```

The worker receives the full request path including locale prefix (e.g., `/us/en/posts/1`)
and must strip the locale segments before matching against the `/posts` mappings.
It should return `200` with rendered HTML for matched paths and `404` for unmatched
paths so the Admin API falls through to the primary content source.

### Preview

Preview posts pages by triggering the overlay via the Admin API:

```bash
# List page
curl -X POST "https://admin.hlx.page/preview/rahul-chawla-akqa/akqaedsrc/main/us/en/posts" \
  -H "Authorization: Bearer $TOKEN"

# Detail page
curl -X POST "https://admin.hlx.page/preview/rahul-chawla-akqa/akqaedsrc/main/us/en/posts/1" \
  -H "Authorization: Bearer $TOKEN"
```

- List: `https://main--akqaedsrc--rahul-chawla-akqa.aem.page/us/en/posts`
- Detail: `https://main--akqaedsrc--rahul-chawla-akqa.aem.page/us/en/posts/1`

---

## 3. Blogs (AEM Content Fragments)

The `/blogs` routes use AEM Content Fragment data fetched from a GraphQL persisted query,
rendered server-side into EDS block markup.

### Endpoint

```
https://author-p104103-e1884364.adobeaemcloud.com/graphql/execute.json/blog-store/blogpagelist
```

> **Production recommendation**: Use the AEM Publish tier
> (`publish-p104103-e1884364.adobeaemcloud.com`) where persisted queries are publicly
> accessible without auth. This eliminates token management in the JSON2HTML worker.

### JSON2HTML Configuration for Blogs

```bash
curl -X POST "https://json2html.adobeaem.workers.dev/config/rahul-chawla-akqa/akqaedsrc/main" \
  -H "Authorization: Bearer $AEM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "path": "/blogs/",
      "endpoint": "https://publish-p104103-e1884364.adobeaemcloud.com/graphql/execute.json/blog-store/blogpagelist",
      "template": "/templates/blogs/list.html"
    },
    {
      "path": "/blogs/",
      "endpoint": "https://publish-p104103-e1884364.adobeaemcloud.com/graphql/execute.json/blog-store/blogpagelist",
      "regex": "/[a-z0-9-]+$/",
      "template": "/templates/blogs/detail.html"
    }
  ]'
```

### Preview

- List: `https://main--akqaedsrc--rahul-chawla-akqa.aem.page/blogs`
- Detail: `https://main--akqaedsrc--rahul-chawla-akqa.aem.page/blogs/blog-1`

---

## 4. Local Development

For local development, use the proxy server which simulates JSON2HTML behavior:

```bash
# Option 1: Run both manually
node dev-server.mjs          # starts SSR proxy on :4000
aem up --url http://localhost:4000   # points aem dev server at proxy

# Option 2: Use the npm script
npm run dev
```

For blog routes (which need AEM Author GraphQL access), pass the token via `.env.local`:

```bash
# .env.local
AEM_TOKEN="<your-dev-token>"
```

Or inline:

```bash
AEM_TOKEN=<your-dev-token> npm run dev
```

> **Note**: AEM Developer Tokens are short-lived (24h). Regenerate from AEM Developer Console
> or via `aio auth get-token` when they expire.

---

## 5. Key Documentation Links

- [BYOM (Bring Your Own Markup)](https://www.aem.live/developer/byom)
- [json2html Service](https://www.aem.live/developer/json2html)
- [Content Fragment Overlay](https://www.aem.live/developer/content-fragment-overlay)

# AEM Edge Delivery Services (EDS): BYOM & Overlay Feature Blueprint

> ## Superseded — read with care
>
> This is an **earlier exploratory blueprint**, written for a different site (`akqaedsrc`)
> before this project's architecture was built and verified. The implemented architecture is
> [ssr-overlay-architecture.md](ssr-overlay-architecture.md), and the guide for applying it
> is [page-type-playbook.md](page-type-playbook.md).
>
> Two claims below turned out to be **incorrect**, and they matter:
>
> 1. **Overlays cannot be configured in `fstab.yaml`.** The diagram's "Evaluates fstab.yaml
>    Overlay Rule" step does not exist. Overlay configuration requires the configuration
>    service; the mountpoint must be migrated into a site config first.
> 2. **The overlay is not invoked per request.** It runs at preview/publish time, and the
>    result is ingested into the content bus and served statically. A CDN edge worker
>    injecting per-request headers (Geo-IP, region) therefore cannot influence composition —
>    those headers are not present when the overlay runs. Per-request variation needs
>    client-side hydration or a genuine CDN composition layer.
>
> Kept for its App Builder action scaffolding and CDN worker examples. Do not use its
> configuration steps.

---

## 1. System Overview

This feature delivers dynamic product pages by merging static, marketer-authored document content (from SharePoint/Google Drive) with real-time backend data (pricing, stock levels) rendered server-side at the edge via Adobe App Builder (BYOM Overlay).

```
[ User Browser ]
       │
       │ 1. Request GET /products/shoe-123
       ▼
┌─────────────────────────────────────────────────────────┐
│ CDN Edge Worker                                         │
│ • Detects Geo-IP / Region                               │
│ • Injects HTTP Header: X-User-Region: US                │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ 2. Forward request with headers
                           ▼
┌─────────────────────────────────────────────────────────┐
│ AEM Edge Delivery Services (Pipeline)                   │
│ • Fetches Base Page Doc from Google Drive / SharePoint  │
│ • Evaluates fstab.yaml Overlay Rule                     │
│ • Requests BYOM Overlay HTML from App Builder           │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ 3. Fetch Overlay HTML Fragment
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Adobe App Builder (AIO Runtime Action)                  │
│ • Parses SKU / Path from request                        │
│ • Reads X-User-Region header                            │
│ • Queries Commerce / PIM backend                        │
│ • Renders dynamic EDS Block Model HTML                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. File Directory Map

Ensure your project environment follows or creates this directory structure:

```
.
├── aem-eds-project/            # GitHub Repo: AEM Edge Delivery Services
│   ├── fstab.yaml              # EDS Mountpoints & Overlay rules
│   └── blocks/
│       └── product-overlay/    # CSS/JS styling for the BYOM block
│           ├── product-overlay.css
│           └── product-overlay.js
│
├── app-builder-project/        # App Builder / Adobe I/O Project
│   ├── ext.config.yaml         # App Builder extension configuration
│   └── actions/
│       └── product-byom/
│           └── index.js        # Serverless Node.js BYOM action
│
└── edge-worker/                # CDN Script (Cloudflare / Fastly / Akamai)
    └── index.js                # Edge header injection script
```

---

## 3. Implementation Code

### File 1: `app-builder-project/actions/product-byom/index.js`
Creates an Adobe I/O serverless action that generates semantic HTML formatted for AEM Edge Delivery Services block decoration.

```javascript
const { Core } = require('@adobe/aio-sdk');

/**
 * App Builder Web Action for AEM EDS BYOM Overlay
 * @param {Object} params - OW parameters, headers, and query strings
 */
async function main(params) {
  const logger = Core.Logger('byom-product-overlay', { level: params.LOG_LEVEL || 'info' });

  try {
    // 1. Extract product slug/ID from OW path or query
    const path = params.__ow_path || params.path || '';
    const productId = extractProductId(path) || 'shoe-123';

    // 2. Read Edge-injected headers (from Edge Worker)
    const headers = params.__ow_headers || {};
    const region = headers['x-user-region'] || params.region || 'US';

    // 3. Fetch data from backend (PIM/Commerce)
    const product = await fetchProductDetails(productId, region);

    // 4. Render Semantic HTML matching EDS Block standard
    const htmlBody = `
      <div class="product-overlay">
        <div>
          <div>Price</div>
          <div><strong>${product.currencySymbol}${product.price}</strong> (${product.region})</div>
        </div>
        <div>
          <div>Availability</div>
          <div>
            <span class="stock-badge ${product.inStock ? 'in-stock' : 'out-of-stock'}">
              ${product.inStock ? 'In Stock — Ships in 24h' : 'Currently Out of Stock'}
            </span>
          </div>
        </div>
        <div>
          <div>SKU</div>
          <div><code>${product.sku}</code></div>
        </div>
      </div>
    `.trim();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300'
      },
      body: htmlBody
    };

  } catch (err) {
    logger.error('Error executing BYOM action:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: '<div class="product-overlay"><div>Error</div><div>Failed to load product details</div></div>'
    };
  }
}

function extractProductId(path) {
  const match = path.match(/\/products\/([^\/.]+)/);
  return match ? match[1] : null;
}

async function fetchProductDetails(productId, region) {
  const pricing = {
    US: { symbol: '$', price: '149.99' },
    EU: { symbol: '€', price: '139.99' },
    UK: { symbol: '£', price: '119.99' }
  };
  const activePricing = pricing[region.toUpperCase()] || pricing.US;

  return {
    id: productId,
    sku: `SKU-${productId.toUpperCase()}`,
    price: activePricing.price,
    currencySymbol: activePricing.symbol,
    region: region.toUpperCase(),
    inStock: true
  };
}

module.exports = { main };
```

---

### File 2: `app-builder-project/ext.config.yaml`
Configures the App Builder runtime action as a publicly accessible web action.

```yaml
operations:
  worker:
    - type: action
      impl: product-byom/index.js
actions:
  product-byom:
    function: product-byom/index.js
    web: 'yes'
    runtime: 'nodejs:20'
    inputs:
      LOG_LEVEL: 'info'
    annotations:
      final: true
```

---

### File 3: `aem-eds-project/fstab.yaml`
Configures the mountpoint and overlay rule mapping `/products/*` routes to the App Builder endpoint.

```yaml
mountpoints:
  /: https://drive.google.com/drive/folders/YOUR_GOOGLE_DRIVE_FOLDER_ID
  /products/*:
    url: https://YOUR-APP-BUILDER-NAMESPACE.adobeioruntime.net/api/v1/web/product-byom
    type: overlay
```

---

### File 4: `aem-eds-project/blocks/product-overlay/product-overlay.css`
Styles the overlay block returned by the BYOM App Builder action.

```css
.product-overlay {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #f9f9f9;
  margin: 20px 0;
}

.product-overlay > div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eeeeee;
}

.product-overlay > div:last-child {
  border-bottom: none;
}

.product-overlay .stock-badge.in-stock {
  color: #2e7d32;
  font-weight: bold;
}

.product-overlay .stock-badge.out-of-stock {
  color: #c62828;
  font-weight: bold;
}
```

---

### File 5: `edge-worker/index.js`
Edge Worker script running at the CDN layer to inject regional headers before request hitting EDS pipeline.

```javascript
/**
 * CDN Edge Worker for AEM EDS Header Injection
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Clone request headers to allow mutation
  const modifiedHeaders = new Headers(request.headers);

  // Extract country from CDN Edge Context (e.g., Cloudflare request.cf)
  const userCountry = request.cf && request.cf.country ? request.cf.country : 'US';

  // Inject header consumed by App Builder BYOM
  modifiedHeaders.set('X-User-Region', userCountry);

  const forwardRequest = new Request(request, {
    headers: modifiedHeaders
  });

  return fetch(forwardRequest);
}
```

---

## 4. Automated Execution & Deployment Steps

An AI agent or automated CI/CD pipeline must execute the following sequence:

### Step 1: Deploy App Builder Web Action
```bash
cd app-builder-project
npm install
aio login --bare  # Or use AIO_RUNTIME_AUTH secret
aio console:workspace:select
aio app deploy
```
*Output Verification:* Capture the generated Web Action URL from the deployment logs.

### Step 2: Update and Push AEM EDS Configuration
1. Open `aem-eds-project/fstab.yaml`.
2. Replace `https://YOUR-APP-BUILDER-NAMESPACE.adobeioruntime.net/api/v1/web/product-byom` with the deployed URL from Step 1.
3. Commit and push to GitHub repository:
   ```bash
   cd aem-eds-project
   git add fstab.yaml blocks/
   git commit -m "feat(eds): configure App Builder BYOM overlay rule and block styling"
   git push origin main
   ```
4. AEM Code Sync will automatically update `aem.live` / `hlx.live`.

### Step 3: Deploy Edge Worker to CDN
1. Deploy `edge-worker/index.js` to your CDN provider (Cloudflare Workers / Fastly Compute@Edge / Akamai EdgeWorkers).
2. Route trigger rule: `example.com/products/*`.

---

## 5. Automated Testing & Verification

Execute the following HTTP validation command:

```bash
curl -i -H "X-User-Region: EU" https://example.com/products/shoe-123
```

**Expected Results:**
1. **HTTP Status:** `200 OK`
2. **Content:** Full HTML page containing baseline Google Doc content (header, story, footer).
3. **Injected BYOM Block:** HTML snippet `<div class="product-overlay">` present with **€** pricing based on the `X-User-Region: EU` header.
4. **Header Check:** Response includes `cache-control` header specified by App Builder.

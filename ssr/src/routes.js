/*
 * Route table for the overlay composer and the edge PDP worker.
 *
 * Kept as a JS module rather than JSON so it survives the App Builder webpack bundle
 * without import attributes, and so each field can be documented in place.
 *
 * Fields:
 *   id           - label used in logs
 *   match        - regexp source tested against the normalized content path
 *   keyFrom      - where to take the lookup key from, e.g. "match:1" for the first group
 *   metaKey      - page meta tag that overrides the key, e.g. <meta name="product-id">
 *   endpoint     - data URL; {{key}} and {{eds}} are substituted
 *   kind         - "json" returns sheet JSON instead of HTML
 *   serve        - "overlay" (Admin preview/publish) or "edge" (visitor worker only)
 *   templatePath - authored page to fill when it differs from the request path
 *   placeholders - block class name -> renderer name in scripts/renderers/index.js
 *   seo          - optional SEO renderer name
 *   jsonLd       - emit a JSON-LD script into <head> (default true)
 *   cacheControl - Cache-Control returned with a composed response
 */

const PDP_PLACEHOLDERS = {
  'product-specs': 'productSpecs',
  'product-gallery': 'productGallery',
  'product-reviews': 'productReviews',
};

export const routes = [
  {
    id: 'product-data',
    match: '^/product-data/([\\w-]+)$',
    keyFrom: 'match:1',
    kind: 'json',
    serve: 'overlay',
    endpoint: 'https://dummyjson.com/products/{{key}}',
    cacheControl: 'public, max-age=300, s-maxage=300',
  },
  {
    id: 'pdp-from-template',
    match: '^/product-detail/([\\w-]+)$',
    keyFrom: 'match:1',
    serve: 'overlay',
    templatePath: '/product-detail',
    endpoint: '{{eds}}/product-data/{{key}}.json',
    placeholders: PDP_PLACEHOLDERS,
    seo: 'productSeo',
    jsonLd: true,
    cacheControl: 'public, max-age=300, s-maxage=300',
  },
  {
    id: 'product-detail',
    match: '^/products/([\\w-]+)$',
    keyFrom: 'match:1',
    metaKey: 'product-id',
    serve: 'overlay',
    endpoint: 'https://dummyjson.com/products/{{key}}',
    placeholders: PDP_PLACEHOLDERS,
    seo: 'productSeo',
    jsonLd: true,
    cacheControl: 'public, max-age=300, s-maxage=300',
  },
];

/** Routes the BYOM overlay may answer. Edge-only paths 404 so Admin does not ingest HTML. */
export function overlayRoutes() {
  return routes.filter((route) => route.serve !== 'edge');
}

export function edsOrigin() {
  if (process.env.EDS_ORIGIN) return process.env.EDS_ORIGIN.replace(/\/$/, '');
  const org = process.env.AEM_ORG || 'rahul-chawla-akqa';
  const site = process.env.AEM_SITE || 'edspdp';
  const branch = process.env.AEM_BRANCH || 'main';
  return `https://${branch}--${site}--${org}.aem.page`;
}

export function resolveEndpoint(route, key) {
  return route.endpoint
    .replaceAll('{{eds}}', edsOrigin())
    .replaceAll('{{key}}', encodeURIComponent(key));
}

/**
 * Strips everything the Admin API may have appended so route patterns can be written
 * against clean content paths.
 */
export function normalizePath(rawPath) {
  if (!rawPath) return '/';
  let path = String(rawPath).split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\.plain\.html$/i, '').replace(/\.html$/i, '').replace(/\.json$/i, '');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

function keyFromMatch(keyFrom, match) {
  if (!keyFrom) return null;
  const group = /^match:(\d+)$/.exec(keyFrom);
  if (!group) return null;
  return match[Number(group[1])] || null;
}

/**
 * @returns {{route: object, matchKey: string|null}|null} null when no route owns the path,
 * which is the signal to fall through to the primary content source untouched.
 */
export function matchRoute(path, available = routes) {
  const hit = available
    .map((route) => ({ route, match: new RegExp(route.match).exec(path) }))
    .find((entry) => entry.match);
  if (!hit) return null;
  return { route: hit.route, matchKey: keyFromMatch(hit.route.keyFrom, hit.match) };
}

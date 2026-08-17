/*
 * Route table for the overlay composer.
 *
 * Kept as a JS module rather than JSON so it survives the App Builder webpack bundle
 * without import attributes, and so each field can be documented in place.
 *
 * Fields:
 *   id           - label used in logs
 *   match        - regexp source tested against the normalized content path
 *   keyFrom      - where to take the lookup key from, e.g. "match:1" for the first group
 *   metaKey      - page meta tag that overrides the key, e.g. <meta name="product-id">
 *   endpoint     - API URL; {{key}} is substituted with the resolved key
 *   placeholders - block class name -> renderer name in scripts/renderers/index.js
 *   seo          - optional SEO renderer name
 *   jsonLd       - emit a JSON-LD script into <head> (default true)
 *   cacheControl - Cache-Control returned with a composed page
 */
export const routes = [
  {
    id: 'product-detail',
    match: '^/products/([\\w-]+)$',
    keyFrom: 'match:1',
    metaKey: 'product-id',
    endpoint: 'https://dummyjson.com/products/{{key}}',
    placeholders: {
      'product-specs': 'productSpecs',
      'product-gallery': 'productGallery',
      'product-reviews': 'productReviews',
    },
    seo: 'productSeo',
    jsonLd: true,
    cacheControl: 'public, max-age=300, s-maxage=300',
  },
];

/**
 * Strips everything the Admin API may have appended so route patterns can be written
 * against clean content paths.
 */
export function normalizePath(rawPath) {
  if (!rawPath) return '/';
  let path = String(rawPath).split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\.plain\.html$/i, '').replace(/\.html$/i, '');
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

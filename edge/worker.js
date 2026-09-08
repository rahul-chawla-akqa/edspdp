/*
 * Cloudflare Worker for cache-miss PDP HTML.
 *
 * On GET /product-detail/{id} it loads the AEM template and /product-data/{id}.json from
 * EDS, fills placeholders with the shared compose() function, and lets the CDN cache the
 * HTML. Other paths are proxied to EDS unchanged.
 *
 *   npx wrangler deploy --config edge/wrangler.toml
 */
import compose, { OUTCOME } from '../ssr/src/compose.js';
import { unwrapProductJson } from '../scripts/product-json.js';

const DEFAULT_EDS = 'https://main--edspdp--rahul-chawla-akqa.aem.live';

export default {
  async fetch(request, env, ctx) {
    const origin = (env && env.EDS_ORIGIN) || DEFAULT_EDS;
    if (typeof process !== 'undefined' && process.env && !process.env.EDS_ORIGIN) {
      process.env.EDS_ORIGIN = origin;
    }

    const url = new URL(request.url);

    const result = await compose({
      path: url.pathname,
      fetchPrimary: async (contentPath) => {
        try {
          const resp = await fetch(`${origin}${contentPath}`);
          if (!resp.ok) return { status: resp.status, html: '' };
          return { status: 200, html: await resp.text() };
        } catch {
          return { status: 504, html: '' };
        }
      },
      fetchData: async (endpoint) => {
        try {
          const resp = await fetch(endpoint);
          if (!resp.ok) return null;
          return unwrapProductJson(await resp.json());
        } catch {
          return null;
        }
      },
    });

    if (result.status === 200) {
      const response = new Response(result.body, {
        status: 200,
        headers: result.headers,
      });
      if (ctx && globalThis.caches && globalThis.caches.default
        && result.headers['content-type'] && result.headers['content-type'].includes('text/html')) {
        ctx.waitUntil(globalThis.caches.default.put(request, response.clone()));
      }
      return response;
    }

    if (result.outcome === OUTCOME.NO_ROUTE) {
      return fetch(new URL(`${url.pathname}${url.search}`, `${origin}/`));
    }

    return new Response(result.outcome || 'not found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

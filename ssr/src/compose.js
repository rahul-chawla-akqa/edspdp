import { parse } from 'node-html-parser';
import { blockRenderers, seoRenderers } from '../../scripts/renderers/index.js';
import { escapeHtml } from '../../scripts/renderers/html.js';
import { matchRoute, normalizePath } from './routes.js';

/*
 * Marker class added to blocks the composer filled. Block JS checks for it to decide
 * whether to hydrate client-side, so it must stay in sync with scripts/product-data.js.
 * Block class names may only contain alphanumerics and single dashes to survive ingestion.
 */
export const RENDERED_CLASS = 'api-rendered';

/**
 * Every non-composed outcome resolves to a 404, which makes the Admin API fall back to the
 * primary content source. That keeps the failure path byte-identical to having no overlay
 * configured at all, rather than risking a half-composed page going live.
 */
export const OUTCOME = {
  NO_ROUTE: 'no-route',
  NO_PLACEHOLDER: 'no-placeholder',
  PRIMARY_MISSING: 'primary-missing',
  NO_KEY: 'no-key',
  DATA_UNAVAILABLE: 'data-unavailable',
  COMPOSED: 'composed',
};

const DOCTYPE = /^\s*<!doctype[^>]*>\s*/i;

function miss(outcome) {
  return { status: 404, outcome, body: '' };
}

/** Reads the override key an author may have typed into the placeholder block. */
function blockOverrideKey(elements) {
  const authored = elements
    .map((element) => element.textContent.trim())
    .find((text) => /^[\w-]+$/.test(text));
  return authored || null;
}

function metaKey(head, name) {
  if (!head || !name) return null;
  const meta = head.querySelector(`meta[name="${name}"]`);
  const content = meta ? (meta.getAttribute('content') || '').trim() : '';
  return content || null;
}

/*
 * Meta tags are rebuilt from an escaped string rather than mutated with setAttribute:
 * node-html-parser escapes only double quotes when setting an attribute, leaving a raw
 * `&` or `<` from the API in the markup.
 */
function upsertMeta(head, entry) {
  const attr = entry.property ? 'property' : 'name';
  const key = entry.property || entry.name;
  const existing = head.querySelector(`meta[${attr}="${key}"]`);
  if (existing && entry.mode === 'fill') return;

  const tag = parse(`<meta ${attr}="${key}" content="${escapeHtml(entry.content)}">`).firstChild;
  if (existing) existing.replaceWith(tag);
  else head.appendChild(tag);
}

function applySeo(head, seo, emitJsonLd) {
  if (!head || !seo) return;

  if (seo.title) {
    const title = head.querySelector('title');
    if (title) title.set_content(escapeHtml(seo.title));
    else head.appendChild(parse(`<title>${escapeHtml(seo.title)}</title>`).firstChild);
  }

  (seo.meta || []).forEach((entry) => upsertMeta(head, entry));

  if (emitJsonLd && seo.jsonLd) {
    // `<` is escaped so a value containing "</script>" cannot break out of the element.
    const payload = JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c');
    head.appendChild(parse(`<script type="application/ld+json">${payload}</script>`).firstChild);
  }
}

/**
 * Merges external API data into an AEM-authored page.
 *
 * Pure by design: all I/O is injected, so the same function backs the App Builder action,
 * the local dev server and the unit tests.
 *
 * @param {object} options
 * @param {string} options.path            requested content path
 * @param {function} options.fetchPrimary  (path) => Promise<{status, html}>
 * @param {function} options.fetchData     (endpoint) => Promise<object|null>
 * @param {object}   [options.logger]
 * @param {Array}    [options.available]   route table override, for tests
 * @returns {Promise<{status:number, outcome:string, body:string, headers?:object}>}
 */
export default async function compose({
  path,
  fetchPrimary,
  fetchData,
  logger = console,
  available,
}) {
  const contentPath = normalizePath(path);

  // Cheapest check first: the overlay is consulted for every path on the site, so a
  // non-matching request must cost zero network calls.
  const matched = matchRoute(contentPath, available);
  if (!matched) return miss(OUTCOME.NO_ROUTE);
  const { route, matchKey } = matched;

  const primary = await fetchPrimary(contentPath);
  if (!primary || primary.status !== 200 || !primary.html) {
    return miss(OUTCOME.PRIMARY_MISSING);
  }

  const hadDoctype = DOCTYPE.test(primary.html);
  const root = parse(primary.html.replace(DOCTYPE, ''));
  const head = root.querySelector('head');

  const targets = Object.entries(route.placeholders)
    .map(([className, rendererName]) => ({
      className,
      renderer: blockRenderers[rendererName],
      elements: root.querySelectorAll(`.${className}`),
    }))
    .filter((target) => target.elements.length);

  if (!targets.length) return miss(OUTCOME.NO_PLACEHOLDER);

  const unknown = targets.filter((target) => !target.renderer);
  if (unknown.length) {
    logger.error(`compose: no renderer registered for ${unknown.map((t) => t.className).join(', ')}`);
    return miss(OUTCOME.NO_PLACEHOLDER);
  }

  const allElements = targets.flatMap((target) => target.elements);
  const key = blockOverrideKey(allElements) || metaKey(head, route.metaKey) || matchKey;
  if (!key) return miss(OUTCOME.NO_KEY);

  const endpoint = route.endpoint.replace('{{key}}', encodeURIComponent(key));
  const data = await fetchData(endpoint);
  if (!data) {
    logger.error(`compose: no data for ${contentPath} from ${endpoint}`);
    return miss(OUTCOME.DATA_UNAVAILABLE);
  }

  let filled = 0;
  targets.forEach(({ renderer, elements }) => {
    const markup = renderer(data);
    if (!markup) return;
    elements.forEach((element) => {
      element.set_content(markup);
      element.classList.add(RENDERED_CLASS);
      filled += 1;
    });
  });

  // Nothing rendered means the API answered but had no usable fields for this page;
  // fall back so client-side hydration can decide what to show.
  if (!filled) return miss(OUTCOME.DATA_UNAVAILABLE);

  if (route.seo && seoRenderers[route.seo]) {
    applySeo(head, seoRenderers[route.seo](data), route.jsonLd !== false);
  }

  const body = `${hadDoctype ? '<!DOCTYPE html>\n' : ''}${root.toString()}`;
  return {
    status: 200,
    outcome: OUTCOME.COMPOSED,
    body,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': route.cacheControl || 'public, max-age=300',
    },
  };
}

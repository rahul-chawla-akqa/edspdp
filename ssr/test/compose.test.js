import test from 'node:test';
import assert from 'node:assert/strict';

import compose, { OUTCOME, RENDERED_CLASS } from '../src/compose.js';
import { matchRoute, normalizePath } from '../src/routes.js';
import {
  authoredPage, placeholder, product, stubs,
} from './fixtures.js';

const allBlocks = [
  placeholder('product-gallery'),
  placeholder('product-specs'),
  placeholder('product-reviews'),
].join('\n');

function composePage(html, overrides = {}) {
  const stub = stubs({ primary: { status: 200, html }, ...overrides });
  return compose({ path: '/products/1', ...stub }).then((result) => ({ ...result, stub }));
}

test('normalizePath strips suffixes, queries and trailing slashes', () => {
  assert.equal(normalizePath('/products/1.html'), '/products/1');
  assert.equal(normalizePath('/products/1.plain.html'), '/products/1');
  assert.equal(normalizePath('/products/1/?foo=bar'), '/products/1');
  assert.equal(normalizePath('products/1'), '/products/1');
  assert.equal(normalizePath('/'), '/');
});

test('matchRoute extracts the key from the path and ignores unrelated paths', () => {
  const matched = matchRoute('/products/abc-123');
  assert.equal(matched.route.id, 'product-detail');
  assert.equal(matched.matchKey, 'abc-123');
  assert.equal(matchRoute('/about-us'), null);
  assert.equal(matchRoute('/products/1/reviews'), null);
});

test('a non-matching path is rejected without any network call', async () => {
  const stub = stubs();
  const result = await compose({ path: '/about-us', ...stub });
  assert.equal(result.status, 404);
  assert.equal(result.outcome, OUTCOME.NO_ROUTE);
  assert.deepEqual(stub.calls.primary, []);
  assert.deepEqual(stub.calls.data, []);
});

test('a page with no placeholder block is left to the primary source', async () => {
  const { outcome, status, stub } = await composePage(authoredPage());
  assert.equal(status, 404);
  assert.equal(outcome, OUTCOME.NO_PLACEHOLDER);
  // Primary was consulted, but the data API was never hit.
  assert.deepEqual(stub.calls.primary, ['/products/1']);
  assert.deepEqual(stub.calls.data, []);
});

test('a missing primary page yields 404 without calling the data API', async () => {
  const stub = stubs({ primary: { status: 404, html: '' } });
  const result = await compose({ path: '/products/1', ...stub });
  assert.equal(result.status, 404);
  assert.equal(result.outcome, OUTCOME.PRIMARY_MISSING);
  assert.deepEqual(stub.calls.data, []);
});

test('an unavailable data API falls back rather than publishing a partial page', async () => {
  const primary = { status: 200, html: authoredPage({ blocks: allBlocks }) };
  const stub = stubs({ primary, data: null });
  const result = await compose({ path: '/products/1', ...stub });
  assert.equal(result.status, 404);
  assert.equal(result.outcome, OUTCOME.DATA_UNAVAILABLE);
  assert.equal(result.body, '');
});

test('composes all placeholders and marks them rendered', async () => {
  const { status, outcome, body } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.equal(status, 200);
  assert.equal(outcome, OUTCOME.COMPOSED);

  assert.equal((body.match(new RegExp(RENDERED_CLASS, 'g')) || []).length, 3);
  assert.match(body, /class="product-specs api-rendered"/);
  assert.ok(body.includes('BEA-ESS-ESS-001'), 'specs include the SKU');
  assert.ok(body.includes('1 week warranty'), 'specs include warranty text');
  assert.ok(body.includes('essence/1.webp'), 'gallery includes the first image');
  assert.ok(body.includes('Eleanor Collins'), 'reviews include the reviewer');
  assert.ok(body.includes('30 April 2025'), 'review dates are formatted deterministically');
});

test('authored content outside the placeholders is preserved verbatim', async () => {
  const { body } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.ok(body.startsWith('<!DOCTYPE html>'), 'doctype is retained');
  assert.match(body, /<h1 id="product-page">Product Page<\/h1>/);
  assert.match(body, /<header><\/header>/);
  assert.match(body, /<footer><\/footer>/);
  assert.match(body, /rel="canonical"/);
});

test('price and stock are never baked into the page', async () => {
  const { body } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.ok(!body.includes('9.99'), 'price is excluded as volatile data');
  assert.ok(!body.includes('In Stock'), 'stock status is excluded as volatile data');
});

test('SEO replaces authored titles and descriptions but fills keywords', async () => {
  const { body } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.match(body, /<title>Essence Mascara Lash Princess<\/title>/);
  assert.match(body, /property="og:title" content="Essence Mascara Lash Princess"/);
  assert.match(body, /name="description" content="A popular mascara known for its volumizing effects."/);
  assert.match(body, /name="keywords" content="beauty, mascara"/);
});

test('a fill-mode meta tag does not clobber an authored value', async () => {
  const html = authoredPage({
    blocks: allBlocks,
    meta: '<meta name="keywords" content="authored, terms">',
  });
  const { body } = await composePage(html);
  assert.match(body, /name="keywords" content="authored, terms"/);
  assert.ok(!body.includes('content="beauty, mascara"'));
});

test('JSON-LD is emitted and cannot break out of the script element', async () => {
  const hostile = { ...product, title: 'Break</script><img src=x>' };
  const { body } = await composePage(authoredPage({ blocks: allBlocks }), { data: hostile });
  assert.match(body, /<script type="application\/ld\+json">/);
  assert.ok(!body.includes('</script><img src=x>'), 'the closing tag is escaped');
  assert.ok(body.includes('\\u003c/script'), 'angle brackets are unicode-escaped');
});

test('an authored block override wins over the path key', async () => {
  const html = authoredPage({ blocks: placeholder('product-specs', '42') });
  const { stub } = await composePage(html);
  assert.deepEqual(stub.calls.data, ['https://dummyjson.com/products/42']);
});

test('page metadata supplies the key when no block override is present', async () => {
  const html = authoredPage({
    blocks: allBlocks,
    meta: '<meta name="product-id" content="77">',
  });
  const { stub } = await composePage(html);
  assert.deepEqual(stub.calls.data, ['https://dummyjson.com/products/77']);
});

test('the path key is used when nothing else supplies one', async () => {
  const { stub } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.deepEqual(stub.calls.data, ['https://dummyjson.com/products/1']);
});

test('one data request serves every placeholder on the page', async () => {
  const { stub } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.equal(stub.calls.data.length, 1);
});

test('composed responses carry html content type and cache headers', async () => {
  const { headers } = await composePage(authoredPage({ blocks: allBlocks }));
  assert.equal(headers['content-type'], 'text/html; charset=utf-8');
  assert.match(headers['cache-control'], /max-age=300/);
});

test('rendered markup contains no spans, data attributes or inline styles', async () => {
  const { body } = await composePage(authoredPage({ blocks: allBlocks }));
  const composed = body.match(/<div class="product-[a-z]+ api-rendered">[\s\S]*?<\/div>\s*<\/div>/g) || [];
  assert.ok(composed.length, 'found composed block markup to inspect');
  composed.forEach((markup) => {
    assert.ok(!/<span/i.test(markup), 'no span tags');
    assert.ok(!/\sdata-[\w-]+=/i.test(markup), 'no data attributes');
    assert.ok(!/\sstyle=/i.test(markup), 'no inline styles');
  });
});

test('meta content is fully escaped, including bare ampersands', async () => {
  const data = { ...product, title: 'Marks & Spencer <b>Sale</b>' };
  const { body } = await composePage(authoredPage({ blocks: allBlocks }), { data });
  assert.match(body, /property="og:title" content="Marks &amp; Spencer &lt;b&gt;Sale&lt;\/b&gt;"/);
  // A bare "&" would be invalid markup and can be mangled during ingestion.
  assert.ok(!/content="[^"]*&(?!amp;|lt;|gt;|quot;|#39;)/.test(body), 'no unescaped ampersands');
});

test('values from the API are escaped into the markup', async () => {
  const hostile = { ...product, brand: '<img src=x onerror=alert(1)>' };
  const { body } = await composePage(authoredPage({ blocks: allBlocks }), { data: hostile });
  assert.ok(!body.includes('<img src=x onerror'), 'injected markup is escaped');
  assert.ok(body.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

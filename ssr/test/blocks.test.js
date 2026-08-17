/*
 * Closes the loop between the two halves of the design: markup the composer writes on the
 * server must be decorated correctly by the block JS that runs in the browser, and the same
 * blocks must hydrate themselves when the overlay did not fill them.
 *
 * jsdom is a devDependency of this package only; it is never shipped to the site.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import compose from '../src/compose.js';
import { authoredPage, placeholder, product } from './fixtures.js';

const BLOCKS = ['product-specs', 'product-gallery', 'product-reviews'];

/*
 * product-data.js caches in-flight requests at module scope, which is what makes three
 * blocks on one page share a single fetch. That cache is intentionally never cleared, so
 * each test here uses a distinct product id to stay isolated from the others.
 */
function installDom(html, { fetchImpl, path = '/products/1' } = {}) {
  const dom = new JSDOM(html, { url: `https://example.com${path}` });
  const previous = {};
  const globals = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    DocumentFragment: dom.window.DocumentFragment,
    fetch: fetchImpl || (async () => ({ ok: false })),
  };
  Object.entries(globals).forEach(([key, value]) => {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  });
  return {
    dom,
    document: dom.window.document,
    restore: () => Object.entries(previous).forEach(([key, value]) => {
      globalThis[key] = value;
    }),
  };
}

/** Imports a block module fresh so its state never leaks between tests. */
async function loadBlock(name, nonce) {
  const module = await import(`../../blocks/${name}/${name}.js?t=${nonce}`);
  return module.default;
}

async function composedDom(nonce, fetchImpl) {
  const blocks = BLOCKS.map((name) => placeholder(name)).join('\n');
  const result = await compose({
    path: '/products/1',
    fetchPrimary: async () => ({ status: 200, html: authoredPage({ blocks }) }),
    fetchData: async () => product,
    logger: { error: () => {}, info: () => {} },
  });
  assert.equal(result.status, 200);
  return installDom(result.body, { fetchImpl });
}

test('server-composed specs decorate into a definition list', async () => {
  const env = await composedDom('specs');
  try {
    const decorate = await loadBlock('product-specs', 'specs');
    const block = env.document.querySelector('.product-specs');
    await decorate(block);

    const terms = [...block.querySelectorAll('dl dt')].map((dt) => dt.textContent);
    const values = [...block.querySelectorAll('dl dd')].map((dd) => dd.textContent);
    assert.ok(terms.includes('Brand'));
    assert.equal(values[terms.indexOf('Brand')], 'Essence');
    assert.equal(values[terms.indexOf('SKU')], 'BEA-ESS-ESS-001');
    assert.equal(terms.length, values.length);
    assert.ok(!terms.includes('Price'), 'volatile fields are absent');
  } finally {
    env.restore();
  }
});

test('server-composed gallery decorates into a stage plus thumbnail buttons', async () => {
  const env = await composedDom('gallery');
  try {
    const decorate = await loadBlock('product-gallery', 'gallery');
    const block = env.document.querySelector('.product-gallery');
    await decorate(block);

    assert.equal(block.querySelectorAll('.product-gallery-stage').length, 1);
    assert.ok(block.querySelector('.product-gallery-stage img'), 'stage has an image');
    // One thumbnail per image in the fixture product.
    const buttons = block.querySelectorAll('.product-gallery-thumbs button');
    assert.equal(buttons.length, product.images.length);
  } finally {
    env.restore();
  }
});

test('a multi-image gallery builds accessible, switchable thumbnails', async () => {
  const blocks = placeholder('product-gallery');
  const multi = {
    ...product,
    images: ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.png'],
  };
  const result = await compose({
    path: '/products/1',
    fetchPrimary: async () => ({ status: 200, html: authoredPage({ blocks }) }),
    fetchData: async () => multi,
    logger: { error: () => {}, info: () => {} },
  });
  const env = installDom(result.body);
  try {
    const decorate = await loadBlock('product-gallery', 'multi');
    const block = env.document.querySelector('.product-gallery');
    await decorate(block);

    const buttons = [...block.querySelectorAll('.product-gallery-thumbs button')];
    assert.equal(buttons.length, 2);
    buttons.forEach((button) => {
      assert.equal(button.getAttribute('type'), 'button');
      assert.match(button.getAttribute('aria-label'), /Show image \d of 2/);
    });
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'false');

    buttons[1].dispatchEvent(new env.dom.window.Event('click'));
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true', 'selection follows the click');
  } finally {
    env.restore();
  }
});

test('gallery images are only run through EDS optimization when same-origin', async () => {
  const blocks = placeholder('product-gallery');
  const mixed = { ...product, images: ['https://cdn.example.com/remote.webp'] };
  const result = await compose({
    path: '/products/1',
    fetchPrimary: async () => ({ status: 200, html: authoredPage({ blocks }) }),
    fetchData: async () => mixed,
    logger: { error: () => {}, info: () => {} },
  });
  const env = installDom(result.body);
  try {
    const decorate = await loadBlock('product-gallery', 'remote');
    const block = env.document.querySelector('.product-gallery');
    await decorate(block);

    const stage = block.querySelector('.product-gallery-stage');
    assert.equal(stage.querySelectorAll('source').length, 0, 'no webp sources for a remote CDN');
    assert.equal(stage.querySelector('img').getAttribute('src'), 'https://cdn.example.com/remote.webp');
    assert.ok(!stage.innerHTML.includes('format=webply'), 'no optimization params on a remote URL');
  } finally {
    env.restore();
  }
});

test('a media-bus image does get EDS optimization sources', async () => {
  const blocks = placeholder('product-gallery');
  // Same-origin, as it is after AEM ingests the image into the media bus.
  const ingested = { ...product, images: ['https://example.com/media_abc.png'] };
  const result = await compose({
    path: '/products/1',
    fetchPrimary: async () => ({ status: 200, html: authoredPage({ blocks }) }),
    fetchData: async () => ingested,
    logger: { error: () => {}, info: () => {} },
  });
  const env = installDom(result.body);
  try {
    const decorate = await loadBlock('product-gallery', 'ingested');
    const block = env.document.querySelector('.product-gallery');
    await decorate(block);

    const stage = block.querySelector('.product-gallery-stage');
    assert.ok(stage.querySelectorAll('source').length > 0, 'optimization sources are generated');
    assert.ok(stage.innerHTML.includes('format=webply'));
  } finally {
    env.restore();
  }
});

test('server-composed reviews decorate into a summary and a list', async () => {
  const env = await composedDom('reviews');
  try {
    const decorate = await loadBlock('product-reviews', 'reviews');
    const block = env.document.querySelector('.product-reviews');
    await decorate(block);

    assert.equal(block.querySelectorAll('.product-reviews-summary').length, 1);
    assert.match(block.querySelector('.product-reviews-summary').textContent, /out of 5/);
    const items = block.querySelectorAll('.product-reviews-list li');
    assert.equal(items.length, product.reviews.length);
    assert.match(items[0].textContent, /Eleanor Collins/);
    assert.ok(items[0].querySelector('blockquote'), 'the comment is a blockquote');
  } finally {
    env.restore();
  }
});

test('an unfilled block hydrates from the API using the URL as the key', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(String(url));
    return { ok: true, json: async () => product };
  };
  // No api-rendered class: this is what Universal Editor renders, or an overlay fallback.
  const html = authoredPage({ blocks: placeholder('product-specs') });
  const env = installDom(html, { fetchImpl, path: '/products/1001' });
  try {
    const decorate = await loadBlock('product-specs', 'hydrate');
    const block = env.document.querySelector('.product-specs');
    await decorate(block);

    assert.deepEqual(requested, ['https://dummyjson.com/products/1001']);
    assert.ok(block.querySelector('dl'), 'hydrated content is decorated the same way');
    assert.match(block.textContent, /Essence/);
  } finally {
    env.restore();
  }
});

test('an authored id in the block overrides the URL when hydrating', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(String(url));
    return { ok: true, json: async () => product };
  };
  const html = authoredPage({ blocks: placeholder('product-specs', '1002') });
  const env = installDom(html, { fetchImpl, path: '/products/1' });
  try {
    const decorate = await loadBlock('product-specs', 'override');
    await decorate(env.document.querySelector('.product-specs'));
    assert.deepEqual(requested, ['https://dummyjson.com/products/1002']);
  } finally {
    env.restore();
  }
});

test('a failed hydration leaves no placeholder text visible to visitors', async () => {
  const html = authoredPage({ blocks: placeholder('product-specs', '1003') });
  const env = installDom(html, { fetchImpl: async () => ({ ok: false }) });
  try {
    const decorate = await loadBlock('product-specs', 'failed');
    const block = env.document.querySelector('.product-specs');
    await decorate(block);
    assert.equal(block.textContent.trim(), '', 'the raw product id is not left on the page');
    assert.equal(block.children.length, 0);
  } finally {
    env.restore();
  }
});

test('a server-composed block does not re-fetch on the client', async () => {
  const requested = [];
  const env = await composedDom('nofetch', async (url) => {
    requested.push(String(url));
    return { ok: true, json: async () => product };
  });
  try {
    const decorate = await loadBlock('product-specs', 'nofetch');
    await decorate(env.document.querySelector('.product-specs'));
    assert.deepEqual(requested, [], 'api-rendered blocks skip hydration entirely');
  } finally {
    env.restore();
  }
});

test('three unfilled blocks share a single API request', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(String(url));
    return { ok: true, json: async () => product };
  };
  const blocks = BLOCKS.map((name) => placeholder(name)).join('\n');
  const env = installDom(authoredPage({ blocks }), { fetchImpl, path: '/products/1004' });
  try {
    const decorators = await Promise.all(
      BLOCKS.map((name) => loadBlock(name, 'shared')),
    );
    await Promise.all(decorators.map(
      (decorate, index) => decorate(env.document.querySelector(`.${BLOCKS[index]}`)),
    ));
    assert.equal(requested.length, 1, 'the request cache deduplicates across blocks');
  } finally {
    env.restore();
  }
});

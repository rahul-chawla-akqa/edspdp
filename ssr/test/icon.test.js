/*
 * The icon utility inlines SVG from /icons with currentColor support. These tests pin
 * the contract blocks and buttons rely on: inline svg markup, cache behaviour, and
 * legacy span.icon placeholder upgrades.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h10v10z"/></svg>';

function installDom() {
  const dom = new JSDOM('<main></main>', { url: 'https://example.com/' });
  const previous = {};
  const globals = {
    document: dom.window.document,
    window: dom.window,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
  };
  Object.entries(globals).forEach(([key, value]) => {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  });
  globalThis.window.hlx = { codeBasePath: '' };
  return {
    restore: () => Object.entries(previous).forEach(([key, value]) => {
      globalThis[key] = value;
    }),
  };
}

function mockFetch(responseByName = { arrow: SAMPLE_SVG, search: SAMPLE_SVG }) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(`${url}`);
    const name = `${url}`.split('/').pop()?.replace('.svg', '');
    const body = responseByName[name];
    if (!body) return { ok: false, text: async () => '' };
    return { ok: true, text: async () => body };
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = previous;
    },
  };
}

async function withIconUtils(fn, nonce = 'icon') {
  const env = installDom();
  const fetchMock = mockFetch();
  try {
    const utils = await import(`../../scripts/ui/icon.js?t=${nonce}`);
    return await fn({ ...utils, fetchMock });
  } finally {
    fetchMock.restore();
    env.restore();
  }
}

test('normalizeSvg strips dimensions and applies currentColor fills', async () => {
  await withIconUtils(({ normalizeSvg }) => {
    const svg = normalizeSvg(SAMPLE_SVG);
    assert.match(svg, /<svg[^>]*viewBox="0 0 24 24"/);
    assert.doesNotMatch(svg, /width="/);
    assert.match(svg, /fill="currentColor"/);
  }, 'normalize');
});

test('createIcon returns inline svg, never an img', async () => {
  await withIconUtils(async ({ createIcon }) => {
    const icon = await createIcon('arrow');
    assert.equal(icon.tagName, 'SPAN');
    assert.deepEqual([...icon.classList], ['icon', 'icon-arrow']);
    assert.equal(icon.querySelector('svg')?.tagName, 'svg');
    assert.equal(icon.querySelector('img'), null);
    assert.equal(icon.getAttribute('aria-hidden'), 'true');
  }, 'create');
});

test('createIcon returns null for invalid names', async () => {
  await withIconUtils(async ({ createIcon }) => {
    assert.equal(await createIcon(''), null);
    assert.equal(await createIcon('Not Valid'), null);
  }, 'invalid');
});

test('createIcon caches icon fetches by name', async () => {
  await withIconUtils(async ({ createIcon, fetchMock }) => {
    await createIcon('arrow');
    await createIcon('arrow');
    assert.equal(fetchMock.calls.length, 1);
    assert.equal(fetchMock.calls[0], '/icons/arrow.svg');
  }, 'cache');
});

test('decorateIcon upgrades a legacy span.icon placeholder', async () => {
  await withIconUtils(async ({ decorateIcon }) => {
    const span = globalThis.document.createElement('span');
    span.className = 'icon icon-arrow';
    await decorateIcon(span);
    assert.equal(span.querySelector('svg')?.tagName, 'svg');
    assert.equal(span.querySelector('img'), null);
  }, 'decorate');
});

test('decorateIcon is idempotent when svg is already present', async () => {
  await withIconUtils(async ({ decorateIcon, fetchMock }) => {
    const span = globalThis.document.createElement('span');
    span.className = 'icon icon-arrow';
    span.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M0 0"/></svg>';
    await decorateIcon(span);
    assert.equal(fetchMock.calls.length, 0);
  }, 'idempotent');
});

test('decorateIcons hydrates all icon placeholders under a root', async () => {
  await withIconUtils(async ({ decorateIcons }) => {
    const root = globalThis.document.createElement('div');
    root.innerHTML = `
      <span class="icon icon-search"></span>
      <span class="icon icon-arrow"></span>
    `;
    await decorateIcons(root);
    assert.equal(root.querySelectorAll('svg').length, 2);
  }, 'decorate-all');
});

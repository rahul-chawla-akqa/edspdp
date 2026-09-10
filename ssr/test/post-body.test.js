/*
 * Post-body decoration: edge-stitched markup and client hydration both land on <article>.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import renderPostBody from '../../scripts/renderers/post-body.js';
import { authoredPage, placeholder } from './fixtures.js';

const POST = {
  userId: 1,
  id: 1,
  title: 'sunt aut facere',
  body: 'quia et suscipit\nsuscipit recusandae',
};

function installDom(html, { fetchImpl, path = '/posts/post-1' } = {}) {
  const dom = new JSDOM(html, { url: `https://example.com${path}` });
  const previous = {};
  const globals = {
    window: dom.window,
    document: dom.window.document,
    fetch: fetchImpl || (async () => ({ ok: false })),
  };
  Object.entries(globals).forEach(([key, value]) => {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  });
  return {
    document: dom.window.document,
    restore: () => Object.entries(previous).forEach(([key, value]) => {
      globalThis[key] = value;
    }),
  };
}

async function loadPostBody(nonce) {
  const module = await import(`../../blocks/post-body/post-body.js?t=${nonce}`);
  return module.default;
}

test('an unfilled post-body hydrates from JSONPlaceholder and decorates', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(String(url));
    return { ok: true, json: async () => POST };
  };
  const html = authoredPage({ blocks: placeholder('post-body') });
  const env = installDom(html, { fetchImpl });
  try {
    const decorate = await loadPostBody('hydrate');
    const block = env.document.querySelector('.post-body');
    await decorate(block);
    assert.deepEqual(requested, ['https://jsonplaceholder.typicode.com/posts/1']);
    assert.equal(block.querySelector('h2').textContent, 'sunt aut facere');
    assert.ok(block.querySelectorAll('p').length >= 2);
  } finally {
    env.restore();
  }
});

test('an api-rendered post-body does not fetch', async () => {
  const requested = [];
  const markup = `<div class="post-body api-rendered">${renderPostBody(POST)}</div>`;
  const env = installDom(authoredPage({ blocks: markup }), {
    fetchImpl: async (url) => {
      requested.push(String(url));
      return { ok: true, json: async () => POST };
    },
  });
  try {
    const decorate = await loadPostBody('rendered');
    await decorate(env.document.querySelector('.post-body'));
    assert.deepEqual(requested, []);
    assert.equal(env.document.querySelector('.post-body h2').textContent, 'sunt aut facere');
  } finally {
    env.restore();
  }
});

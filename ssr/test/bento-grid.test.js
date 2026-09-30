/*
 * bento-grid is the first consumer of the shared tag utility. The authored chip paragraph
 * is replaced by a generated tag, so this checks the card ends up with exactly one tag,
 * keeps the block's placement hook, and carries the authoring instrumentation across.
 *
 * scripts.js decorates the page as soon as it is imported, so the fixtures use the section
 * markup the backend delivers and the block is decorated by hand once that pass settles.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const CARD_TEXT = `
  <p data-aue-prop="cardText_chip" data-aue-type="text">Technology</p>
  <h3>Sustainable mobility</h3>
  <p>17 July 2026</p>
`;

function authoredGrid(cardText = CARD_TEXT, headerLink = '') {
  const linkRow = headerLink
    ? `<div><div><a href="/discover" data-aue-prop="link">${headerLink}</a></div></div>`
    : '<div><div></div></div>';
  return `<main><div>
    <div class="bento-grid layout-equal-4">
      <div><div>Insights</div></div>
      <div><div><h2>Latest stories</h2></div></div>
      ${linkRow}
      <div>
        <div><picture><img src="/media/card.png" alt="Card"></picture></div>
        <div>${cardText}</div>
        <div><a href="/insights/story">Read more</a></div>
      </div>
    </div>
  </div></main>`;
}

function installDom(html) {
  const dom = new JSDOM(html, { url: 'https://example.com/insights' });
  const previous = {};
  const globals = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    DocumentFragment: dom.window.DocumentFragment,
    fetch: async () => ({ ok: false }),
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

async function decorateGrid(html, nonce) {
  const env = installDom(html);
  const { default: decorate } = await import(`../../blocks/bento-grid/bento-grid.js?t=${nonce}`);
  await new Promise((resolve) => { setTimeout(resolve, 0); });

  const block = env.document.querySelector('.bento-grid');
  decorate(block);
  return { ...env, block };
}

test('the authored chip becomes a single shared tag on the card', async () => {
  const { block, restore } = await decorateGrid(authoredGrid(), 'chip');
  try {
    const card = block.querySelector('.bento-grid-card');
    const tags = card.querySelectorAll('.tag');
    assert.equal(tags.length, 1);

    const [tag] = tags;
    assert.deepEqual([...tag.classList], ['tag', 'bento-grid-tag']);
    assert.equal(tag.textContent, 'Technology');
    assert.equal(tag.parentElement, card, 'the tag is positioned against the card');
    assert.equal(card.querySelector('.bento-grid-body .tag'), null);

    assert.equal(tag.getAttribute('data-aue-prop'), 'cardText_chip');
    assert.equal(tag.getAttribute('data-aue-type'), 'text');

    assert.equal(card.querySelector('.bento-grid-title').textContent, 'Sustainable mobility');
    assert.equal(card.querySelector('.bento-grid-date').textContent, '17 July 2026');
  } finally {
    restore();
  }
});

test('a card without an authored chip renders no tag', async () => {
  const cardText = '<h3>Sustainable mobility</h3><p>17 July 2026</p>';
  const { block, restore } = await decorateGrid(authoredGrid(cardText), 'no-chip');
  try {
    const card = block.querySelector('.bento-grid-card');
    assert.equal(card.querySelector('.tag'), null);
    assert.equal(card.querySelector('.bento-grid-title').textContent, 'Sustainable mobility');
  } finally {
    restore();
  }
});

test('the header link is decorated through the shared button primitive', async () => {
  const { block, restore } = await decorateGrid(authoredGrid(CARD_TEXT, 'Discover All'), 'header-cta');
  try {
    const cta = block.querySelector('.bento-grid-header .bento-grid-cta');
    assert.ok(cta);
    assert.equal(cta.tagName, 'A');
    assert.equal(cta.getAttribute('href'), '/discover');
    assert.equal(cta.className, 'button secondary size-sm bento-grid-cta');
    assert.equal(cta.textContent, 'Discover All');
    assert.equal(cta.getAttribute('data-aue-prop'), 'link');
  } finally {
    restore();
  }
});

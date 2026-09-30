/*
 * The tag utility is the shared source of chip markup, so every block inherits whatever
 * it produces. These tests pin the contract blocks rely on: a single element with the
 * global class, literal text, and nothing at all for an empty label.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { createTag } from '../../scripts/ui/tag.js';

function installDom() {
  const dom = new JSDOM('<main></main>', { url: 'https://example.com/' });
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  return {
    restore: () => Object.entries(previous).forEach(([key, value]) => {
      globalThis[key] = value;
    }),
  };
}

function withDom(fn) {
  const env = installDom();
  try {
    return fn();
  } finally {
    env.restore();
  }
}

test('createTag renders a span carrying the global tag class', () => {
  withDom(() => {
    const tag = createTag('Technology');
    assert.equal(tag.tagName, 'SPAN');
    assert.equal(tag.className, 'tag');
    assert.equal(tag.textContent, 'Technology');
  });
});

test('createTag honours the element name, variant and extra classes', () => {
  withDom(() => {
    const tag = createTag('Events', {
      tagName: 'p',
      variant: 'accent',
      classes: 'bento-grid-tag',
    });
    assert.equal(tag.tagName, 'P');
    assert.deepEqual([...tag.classList], ['tag', 'tag-accent', 'bento-grid-tag']);

    const list = createTag('Events', { classes: ['one', 'two'] });
    assert.deepEqual([...list.classList], ['tag', 'one', 'two']);
  });
});

test('createTag ignores tokens that are not valid class or element names', () => {
  withDom(() => {
    const tag = createTag('News', {
      tagName: 'not a tag',
      variant: 'Not A Variant',
      classes: ['ok', '<script>'],
    });
    assert.equal(tag.tagName, 'SPAN');
    assert.deepEqual([...tag.classList], ['tag', 'ok']);
  });
});

test('createTag writes the label as text, never as markup', () => {
  withDom(() => {
    const tag = createTag('  <b>Tech</b> & Co  ');
    assert.equal(tag.textContent, '<b>Tech</b> & Co');
    assert.equal(tag.children.length, 0);
  });
});

test('createTag returns null for a missing or blank label', () => {
  withDom(() => {
    assert.equal(createTag(''), null);
    assert.equal(createTag('   '), null);
    assert.equal(createTag(undefined), null);
    assert.equal(createTag(null), null);
  });
});

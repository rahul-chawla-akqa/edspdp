import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const SHEET = {
  columns: ['i18n', 'default', 'us_en', 'jp_ja'],
  total: 2,
  offset: 0,
  limit: 2,
  data: [
    {
      i18n: 'form-button',
      default: 'Submit Default',
      us_en: 'Submit En',
      jp_ja: 'submit jp',
    },
    {
      i18n: 'empty-locale',
      default: 'From Default',
      us_en: '',
      jp_ja: 'jp only',
    },
  ],
  ':type': 'sheet',
};

function install(url, fetchImpl) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    fetch: globalThis.fetch,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.fetch = fetchImpl;
  return {
    restore() {
      globalThis.window = previous.window;
      globalThis.document = previous.document;
      globalThis.fetch = previous.fetch;
    },
  };
}

test('fetchPlaceholders loads the sheet once and resolves locale columns', async () => {
  let fetches = 0;
  const env = install('https://example.com/us/en/contact', async (url) => {
    fetches += 1;
    assert.match(String(url), /\/placeholders\.json$/);
    return { ok: true, json: async () => SHEET };
  });
  try {
    const { fetchPlaceholders } = await import('../../scripts/placeholders.js');
    const first = await fetchPlaceholders();
    const second = await fetchPlaceholders();
    const japanese = await fetchPlaceholders('jp_ja');

    assert.equal(fetches, 1);
    assert.equal(first.formButton, 'Submit En');
    assert.equal(second.formButton, 'Submit En');
    assert.equal(first, second);
    assert.equal(japanese.formButton, 'submit jp');
    assert.equal(first.emptyLocale, 'From Default');
    assert.equal(japanese.emptyLocale, 'jp only');
    assert.equal(globalThis.window.placeholders.resolved.formButton, 'Submit En');
  } finally {
    env.restore();
  }
});

test('missing locale column and unprefixed paths use default', async () => {
  let fetches = 0;
  const env = install('https://example.com/contact', async () => {
    fetches += 1;
    return { ok: true, json: async () => SHEET };
  });
  try {
    const { fetchPlaceholders, localeFromPath } = await import('../../scripts/placeholders.js');
    assert.equal(localeFromPath('/jp/ja/form'), 'jp_ja');
    assert.equal(localeFromPath('/contact'), 'default');

    const placeholders = await fetchPlaceholders();
    const french = await fetchPlaceholders('fr_fr');
    assert.equal(fetches, 1);
    assert.equal(placeholders.formButton, 'Submit Default');
    assert.equal(french.formButton, 'Submit Default');
  } finally {
    env.restore();
  }
});

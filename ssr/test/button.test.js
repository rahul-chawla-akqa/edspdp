/*
 * The button utility is the shared source of CTA markup. These tests pin the contract
 * blocks and decorateButtons rely on: semantic element choice, variants, icons, safe
 * labels, and accessible icon-only controls.
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
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (`${url}`.endsWith('.svg')) {
      return { ok: true, text: async () => SAMPLE_SVG };
    }
    return { ok: false, text: async () => '' };
  };
  return {
    restore: () => {
      globalThis.fetch = previousFetch;
      Object.entries(previous).forEach(([key, value]) => {
        globalThis[key] = value;
      });
    },
  };
}

async function withButtonUtils(fn, nonce = 'button') {
  const env = installDom();
  try {
    const utils = await import(`../../scripts/ui/button.js?t=${nonce}`);
    return await fn(utils);
  } finally {
    env.restore();
  }
}

test('createButton renders a link when href is provided', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const button = await createButton({ label: 'Shop now', href: '/shop', variant: 'primary' });
    assert.equal(button.tagName, 'A');
    assert.equal(button.getAttribute('href'), '/shop');
    assert.equal(button.className, 'button primary');
    assert.equal(button.textContent, 'Shop now');
  }, 'link');
});

test('createButton renders a native button when href is omitted', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const button = await createButton({ label: 'Submit', variant: 'secondary' });
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.getAttribute('type'), 'button');
    assert.equal(button.className, 'button secondary');
  }, 'native');
});

test('createButton honours variant, compact size and placement classes', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const button = await createButton({
      label: 'Discover',
      href: '/discover',
      variant: 'accent',
      size: 'sm',
      classes: ['block-cta', 'block-cta-wide'],
    });
    assert.deepEqual([...button.classList], ['button', 'accent', 'size-sm', 'block-cta', 'block-cta-wide']);
  }, 'classes');
});

test('createButton ignores invalid variant and class tokens', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const button = await createButton({
      label: 'Go',
      href: '#',
      variant: 'ghost',
      classes: ['ok', '<script>'],
    });
    assert.deepEqual([...button.classList], ['button', 'ok']);
  }, 'invalid');
});

test('createButton writes labels as text, never as markup', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const button = await createButton({ label: '  <b>Buy</b> & Save  ', href: '#' });
    assert.equal(button.textContent, '<b>Buy</b> & Save');
    assert.equal(button.children.length, 0);
  }, 'text');
});

test('createButton returns null for a missing label on text buttons', async () => {
  await withButtonUtils(async ({ createButton }) => {
    assert.equal(await createButton({ href: '#' }), null);
    assert.equal(await createButton({ label: '   ', href: '#' }), null);
  }, 'missing-label');
});

test('createButton places inline svg before or after the label', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const leading = await createButton({
      label: 'Continue',
      href: '#',
      icon: 'arrow',
    });
    assert.equal(leading.childNodes.length, 2);
    assert.equal(leading.firstElementChild.className, 'icon icon-arrow');
    assert.equal(leading.firstElementChild.querySelector('svg')?.tagName, 'svg');
    assert.equal(leading.lastChild.textContent, 'Continue');

    const trailing = await createButton({
      label: 'Continue',
      href: '#',
      icon: 'arrow',
      iconPosition: 'end',
    });
    assert.equal(trailing.childNodes.length, 2);
    assert.equal(trailing.firstChild.textContent, 'Continue');
    assert.equal(trailing.lastElementChild.className, 'icon icon-arrow');
    assert.equal(trailing.querySelector('.icon svg path')?.getAttribute('fill'), 'currentColor');
  }, 'icons');
});

test('createButton requires an accessible name for icon-only controls', async () => {
  await withButtonUtils(async ({ createButton }) => {
    assert.equal(await createButton({ icon: 'search', iconOnly: true }), null);

    const button = await createButton({
      icon: 'search',
      iconOnly: true,
      ariaLabel: 'Search',
      variant: 'secondary',
    });
    assert.equal(button.className, 'button secondary icon-only');
    assert.equal(button.getAttribute('aria-label'), 'Search');
    assert.equal(button.textContent, '');
    assert.equal(button.querySelector('.icon svg')?.tagName, 'svg');
  }, 'icon-only');
});

test('createButton applies disabled state to links and buttons differently', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const link = await createButton({ label: 'Unavailable', href: '#', disabled: true });
    assert.equal(link.getAttribute('aria-disabled'), 'true');
    assert.equal(link.hasAttribute('disabled'), false);

    const button = await createButton({ label: 'Unavailable', disabled: true });
    assert.equal(button.disabled, true);
    assert.equal(button.getAttribute('aria-disabled'), null);
  }, 'disabled');
});

test('decorateButton preserves an existing link and applies the shared classes', async () => {
  await withButtonUtils(async ({ decorateButton }) => {
    const link = globalThis.document.createElement('a');
    link.href = '/discover';
    link.textContent = 'Discover All';
    link.setAttribute('data-aue-prop', 'link');

    await decorateButton(link, {
      variant: 'secondary',
      size: 'sm',
      classes: 'bento-grid-cta',
      label: 'Discover All',
    });

    assert.equal(link.getAttribute('href'), '/discover');
    assert.equal(link.getAttribute('data-aue-prop'), 'link');
    assert.equal(link.className, 'button secondary size-sm bento-grid-cta');
    assert.equal(link.textContent, 'Discover All');
  }, 'decorate');
});

test('createButton renders a text link with a trailing external-link icon', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const link = await createButton({ label: 'Label', href: '#', variant: 'text' });
    assert.equal(link.tagName, 'A');
    assert.equal(link.className, 'button text');
    assert.equal(link.childNodes.length, 2);
    assert.equal(link.firstChild.textContent, 'Label');
    assert.equal(link.lastElementChild.className, 'icon icon-external-link');
  }, 'text-link');
});

test('createButton rejects text variant without href', async () => {
  await withButtonUtils(async ({ createButton }) => {
    assert.equal(await createButton({ label: 'Label', variant: 'text' }), null);
  }, 'text-native');
});

test('createButton honours md and xs sizes', async () => {
  await withButtonUtils(async ({ createButton }) => {
    const medium = await createButton({
      label: 'Go', href: '#', variant: 'text', size: 'md',
    });
    assert.deepEqual([...medium.classList], ['button', 'text', 'size-md']);

    const extraSmall = await createButton({
      label: 'Go', href: '#', variant: 'text', size: 'xs',
    });
    assert.deepEqual([...extraSmall.classList], ['button', 'text', 'size-xs']);
  }, 'text-sizes');
});

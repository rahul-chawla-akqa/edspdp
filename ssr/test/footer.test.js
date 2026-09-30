/*
 * The footer is a container block: every child item row starts with the fixed `type`
 * property from its model, which is what the layout parser keys off. These tests use the
 * row markup the backend delivers so the parser stays independent of authoring attributes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

function authoredFooter() {
  return `
    <div class="footer block">
      <div>
        <div>nav-column</div>
        <div>THE PROGRESS</div>
        <div><a href="/progress">Apollo Tyres</a></div>
        <div><a href="/vredestein">Vredestein</a></div>
      </div>
      <div>
        <div>nav-column</div>
        <div>THE BUREAU</div>
        <div>
          <p><a href="/media">Media Coverage</a></p>
          <p><a href="/news">Newsroom</a></p>
        </div>
      </div>
      <div>
        <div>nav-column</div>
        <div>THE IMPACT</div>
        <div><a href="/impact">Sustainable Procurement</a></div>
      </div>
      <div>
        <div>nav-column</div>
        <div>THE PEOPLE</div>
        <div><a href="/careers">Career</a></div>
      </div>
      <div>
        <div>nav-column</div>
        <div>PARTNER WITH US</div>
      </div>
      <div>
        <div>logo</div>
        <div><picture><img src="/media/logo.png" alt="Apollo Tyres Ltd"></picture></div>
        <div><a href="/">Apollo Tyres home</a></div>
      </div>
      <div>
        <div>legal</div>
        <div>© 2027 Apollo Tyres Ltd</div>
        <div>
          <p><a href="/privacy">Privacy Notice</a></p>
          <p><a href="/terms">Terms &amp; Conditions</a></p>
          <p><a href="/cookies">Cookie Notice</a></p>
        </div>
      </div>
      <div>
        <div>social</div>
        <div>
          <p><a href="https://www.linkedin.com/company/apollo">https://www.linkedin.com/company/apollo</a></p>
          <p><a href="https://www.youtube.com/apollo">https://www.youtube.com/apollo</a></p>
        </div>
      </div>
    </div>
  `;
}

function installDom(html) {
  const dom = new JSDOM(`<main><div class="section">${html}</div></main>`, {
    url: 'https://example.com/footer',
  });
  const previous = {};
  const globals = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
  };
  Object.entries(globals).forEach(([key, value]) => {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  });
  return { dom, previous };
}

function restoreGlobals(previous) {
  Object.entries(previous).forEach(([key, value]) => {
    globalThis[key] = value;
  });
}

async function loadLayout() {
  return import(`../../blocks/footer/footer-layout.js?t=${Date.now()}${Math.random()}`);
}

test('nav column items fill the five grid slots in authored order', async () => {
  const { dom, previous } = installDom(authoredFooter());
  const { renderFooter } = await loadLayout();

  const block = dom.window.document.querySelector('.footer.block');
  renderFooter(block);

  const slots = block.querySelectorAll('.footer-nav-slot');
  assert.equal(slots.length, 5);
  assert.equal(block.querySelectorAll('.footer-nav-column').length, 5);
  assert.equal(slots[0].querySelector('.footer-nav-heading').textContent, 'THE PROGRESS');
  assert.equal(slots[0].querySelectorAll('.footer-nav-link').length, 2);
  assert.equal(slots[1].querySelector('.footer-nav-heading').textContent, 'THE BUREAU');
  // grouped fields arrive as several links inside a single cell
  assert.equal(slots[1].querySelectorAll('.footer-nav-link').length, 2);
  // the last column has a heading but no links yet
  assert.equal(slots[4].querySelectorAll('.footer-nav-link').length, 0);

  restoreGlobals(previous);
});

test('logo, legal, and social items render outside the nav grid', async () => {
  const { dom, previous } = installDom(authoredFooter());
  const { renderFooter } = await loadLayout();

  const block = dom.window.document.querySelector('.footer.block');
  renderFooter(block);

  const logoLink = block.querySelector('.footer-brand .footer-logo-link');
  assert.equal(logoLink.getAttribute('href'), '/');
  assert.equal(logoLink.querySelector('img').getAttribute('alt'), 'Apollo Tyres Ltd');

  assert.match(block.querySelector('.footer-copyright').textContent, /2027 Apollo Tyres Ltd/);
  assert.equal(block.querySelectorAll('.footer-bar .footer-legal-link').length, 3);

  // networks are identified by URL, so skipped platforms do not shift the labels
  const social = [...block.querySelectorAll('.footer-social-link')];
  assert.deepEqual(social.map((link) => link.textContent), ['LinkedIn', 'YouTube']);
  assert.deepEqual(social.map((link) => link.className), [
    'footer-social-link footer-social-linkedin',
    'footer-social-link footer-social-youtube',
  ]);

  restoreGlobals(previous);
});

test('rows without an item type are ignored', async () => {
  const { dom, previous } = installDom('<div class="footer block"><div><div></div></div></div>');
  const { renderFooter, rowType } = await loadLayout();

  const block = dom.window.document.querySelector('.footer.block');
  assert.equal(rowType(block.firstElementChild), '');

  renderFooter(block);
  assert.equal(block.querySelectorAll('.footer-nav-column').length, 0);
  assert.equal(block.querySelector('.footer-bar'), null);

  restoreGlobals(previous);
});

test('the section background image becomes a custom property on the shell', async () => {
  const { dom, previous } = installDom(authoredFooter());
  const { applySectionBackground } = await loadLayout();

  // the backend lowercases the section field into a data attribute
  const section = dom.window.document.querySelector('.section');
  section.setAttribute('data-backgroundimage', 'https://example.com/bg.jpg');
  const shell = dom.window.document.createElement('div');
  applySectionBackground(section, shell);

  assert.equal(
    shell.style.getPropertyValue('--footer-background-image'),
    'url("/bg.jpg")',
  );

  // the delivered rendition is widened, and a same-host asset drops the origin so the
  // scheme of the delivered reference cannot break the request
  section.setAttribute('data-backgroundimage', 'https://example.com/media_abc.jpg?width=750&format=jpg&optimize=medium');
  applySectionBackground(section, shell);
  assert.equal(
    shell.style.getPropertyValue('--footer-background-image'),
    'url("/media_abc.jpg?width=1600&format=jpg&optimize=medium")',
  );

  restoreGlobals(previous);
});

test('a section without a background image leaves the shell untouched', async () => {
  const { dom, previous } = installDom(authoredFooter());
  const { applySectionBackground } = await loadLayout();

  const shell = dom.window.document.createElement('div');
  applySectionBackground(dom.window.document.querySelector('.section'), shell);
  assert.equal(shell.getAttribute('style'), null);

  restoreGlobals(previous);
});

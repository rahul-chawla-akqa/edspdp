import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

function authoredFooterBlock() {
  return `
    <div class="footer block">
      <div>
        <div>Footer Nav Column</div>
        <div>THE PROGRESS</div>
        <div><a href="/progress">Apollo Tyres</a></div>
        <div><a href="/vredestein">Vredestein</a></div>
      </div>
      <div>
        <div>Footer Nav Column</div>
        <div>THE BUREAU</div>
        <div><a href="/news">Newsroom</a></div>
      </div>
      <div>
        <div>Footer Nav Column</div>
        <div>THE IMPACT</div>
        <div><a href="/impact">Sustainable Procurement</a></div>
      </div>
      <div>
        <div>Footer Nav Column</div>
        <div>THE PEOPLE</div>
        <div><a href="/careers">Career</a></div>
      </div>
      <div>
        <div>Footer Nav Column</div>
        <div>PARTNER WITH US</div>
      </div>
      <div>
        <div>Footer Logo</div>
        <div><picture><img src="/media/logo.png" alt="Apollo Tyres Ltd"></picture></div>
        <div><a href="/">Home</a></div>
      </div>
      <div>
        <div>Footer Legal</div>
        <div>© 2027 Apollo Tyres Ltd</div>
        <div><a href="/privacy">Privacy Notice</a></div>
        <div><a href="/terms">Terms &amp; Conditions</a></div>
        <div><a href="/cookies">Cookie Notice</a></div>
      </div>
      <div>
        <div>Footer Social</div>
        <div><a href="https://facebook.com/apollo">Facebook</a></div>
        <div><a href="https://x.com/apollo">X</a></div>
        <div><a href="https://instagram.com/apollo">Instagram</a></div>
        <div><a href="https://linkedin.com/company/apollo">LinkedIn</a></div>
        <div><a href="https://youtube.com/apollo">YouTube</a></div>
      </div>
    </div>
  `;
}

function installDom(html) {
  const dom = new JSDOM(`<main>${html}</main>`, { url: 'https://example.com/' });
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

test('footer maps nav columns in row order into five grid slots', async () => {
  const nonce = Date.now();
  const { dom, previous } = installDom(authoredFooterBlock());
  const { renderFooterContent, rowKind } = await import(`../../blocks/footer/footer-layout.js?t=${nonce}`);

  const sourceBlock = dom.window.document.querySelector('.footer.block');
  assert.equal(rowKind(sourceBlock.children[0]), 'nav-column');

  const shell = dom.window.document.createElement('div');
  shell.className = 'footer-shell';
  renderFooterContent(shell, sourceBlock);

  assert.equal(shell.querySelectorAll('.footer-nav-slot').length, 5);
  assert.equal(shell.querySelectorAll('.footer-nav-column').length, 5);
  assert.equal(
    shell.querySelector('.footer-nav-slot:first-child .footer-nav-heading').textContent,
    'THE PROGRESS',
  );
  assert.equal(shell.querySelectorAll('.footer-nav-slot:first-child .footer-nav-link').length, 2);
  assert.ok(shell.querySelector('.footer-brand img'));
  assert.match(shell.querySelector('.footer-copyright').textContent, /2027 Apollo Tyres Ltd/);
  assert.equal(shell.querySelectorAll('.footer-legal-link').length, 3);
  assert.equal(shell.querySelectorAll('.footer-social-link').length, 5);

  restoreGlobals(previous);
});

test('applySectionBackground sets CSS variable from section dataset', async () => {
  const nonce = Date.now();
  const { dom, previous } = installDom('<div></div>');
  const { applySectionBackground } = await import(`../../blocks/footer/footer-layout.js?t=${nonce}`);

  const section = dom.window.document.createElement('div');
  section.dataset.backgroundImage = 'https://example.com/bg.jpg';
  const shell = dom.window.document.createElement('div');
  applySectionBackground(section, shell);

  assert.equal(
    shell.style.getPropertyValue('--footer-background-image'),
    'url("https://example.com/bg.jpg")',
  );

  restoreGlobals(previous);
});

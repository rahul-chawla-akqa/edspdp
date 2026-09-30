import {
  loadHeader,
  loadFooter,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
} from './aem.js';
import { bindOpenModalOnClick } from './open-modal.js';
import { decorateButton } from './ui/button.js';
import { decorateIcons } from './ui/icon.js';
import { fetchPlaceholders } from './placeholders.js';

// brand applied when a page carries no `theme` metadata, see styles/styles.css
const DEFAULT_THEME = 'apollo';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons or text links.
 * @param {HTMLElement} main The main container element
 */
export async function decorateButtons(main) {
  const tasks = [];

  main.querySelectorAll('p a[href]').forEach((a) => {
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    const strong = a.closest('strong');
    const em = a.closest('em');
    const isTextLink = !strong && !em && a.hasAttribute('data-aue-prop');

    if (!strong && !em && !isTextLink) return;

    p.className = 'button-wrapper';

    if (isTextLink) {
      tasks.push(decorateButton(a, {
        variant: 'text',
        title: a.title || text,
        label: text,
      }).then((button) => {
        if (button) bindOpenModalOnClick(button);
      }));
      return;
    }

    let variant = 'secondary';
    if (strong && em) {
      variant = 'accent';
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      variant = 'primary';
      strong.replaceWith(a);
    } else {
      em.replaceWith(a);
    }

    tasks.push(decorateButton(a, {
      variant,
      title: a.title || text,
    }).then((button) => {
      if (button) bindOpenModalOnClick(button);
    }));
  });

  await Promise.all(tasks);
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export async function decorateMain(main) {
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  await decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  window.hlx.placeholdersReady = fetchPlaceholders();
  decorateTemplateAndTheme();
  if (!getMetadata('theme')) document.body.classList.add(DEFAULT_THEME);
  const main = doc.querySelector('main');
  if (main) {
    await decorateMain(main);
    await decorateIcons(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Subscribes the modal module to `eds:open-modal` after LCP.
 * Dynamic import keeps modal.js and fragment.js off the eager path;
 * the import is not awaited so remaining lazy work is not blocked.
 */
function initModalTriggers() {
  // Lazy import: fragment.js already imports decorateMain from this file.
  // eslint-disable-next-line import/no-cycle
  import('../blocks/modal/modal.js')
    .then(({ bindModalTriggers }) => bindModalTriggers())
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialise modal triggers', error);
    });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  initModalTriggers();
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

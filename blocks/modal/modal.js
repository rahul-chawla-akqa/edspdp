import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';

/*
  This is not a traditional block, so there is no decorate function.
  bindModalTriggers() is called once from scripts.js (lazy phase) and listens
  document-wide so any block can open a modal. Other code can also call
  createModal() and openModal() directly.

  openModal() keeps a single active instance: calling it again while open only
  swaps header/content and wrapper classes (e.g. width variants) — close/outside
  handlers are not rebound.
*/

/** @type {null | Awaited<ReturnType<typeof createModal>>} */
let activeModal = null;

/** Monotonic id so overlapping openModal calls only apply the latest result. */
let openRequestId = 0;

/**
 * Normalizes openModal's second argument (string title or options object).
 * @param {string | {
 *   headerText?: string,
 *   classes?: string | string[],
 * }} [options]
 * @returns {{ headerText: string, classes: string[] }}
 */
function normalizeOpenOptions(options = {}) {
  if (typeof options === 'string') {
    return { headerText: options, classes: [] };
  }

  const { headerText = '', classes = [] } = options;
  const list = Array.isArray(classes)
    ? classes
    : String(classes).split(/\s+/);

  return {
    headerText,
    classes: list.map((c) => c.trim()).filter(Boolean),
  };
}

/**
 * Creates the modal shell (dialog, close control, listeners) once per open cycle.
 * @param {Node[]} contentNodes
 * @param {string} [headerText]
 * @param {string[]} [classes]
 */
export async function createModal(contentNodes, headerText = '', classes = []) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);

  const dialog = document.createElement('dialog');

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.innerHTML = '<span class="icon icon-close"></span>';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.append(closeButton);

  const dialogHeader = document.createElement('div');
  dialogHeader.classList.add('modal-header');
  const heading = document.createElement('h2');
  dialogHeader.append(heading);
  dialog.append(dialogHeader);

  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialog.append(dialogContent);

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  /** Custom classes currently applied for this open cycle (not including `modal`). */
  let appliedClasses = [];

  /**
   * @param {string[]} nextClasses
   */
  function setClasses(nextClasses = []) {
    appliedClasses.forEach((className) => block.classList.remove(className));
    appliedClasses = [...new Set(nextClasses.filter(Boolean))];
    appliedClasses.forEach((className) => block.classList.add(className));
  }

  /**
   * Replaces header + body without recreating the dialog or rebinding events.
   * @param {Node[] | NodeListOf<ChildNode>} nodes
   * @param {string} [nextHeaderText]
   */
  function setContent(nodes, nextHeaderText = '') {
    const text = nextHeaderText || '';
    heading.textContent = text;
    dialogHeader.hidden = !text;

    dialogContent.replaceChildren(...nodes);
    dialogContent.scrollTop = 0;
  }

  function isOpen() {
    return dialog.open;
  }

  // Backdrop / outside click closes the dialog
  dialog.addEventListener('click', (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (activeModal?.block === block) activeModal = null;
    block.remove();
  });

  setClasses(classes);
  setContent(contentNodes, headerText);

  block.replaceChildren(dialog);

  const api = {
    block,
    dialog,
    isOpen,
    setContent,
    setClasses,
    showModal: () => {
      if (!dialog.open) dialog.showModal();
      dialogContent.scrollTop = 0;
      document.body.classList.add('modal-open');
    },
  };

  return api;
}

/**
 * Opens a modal for a fragment URL, or updates the active modal if one is open.
 *
 * @param {string} fragmentUrl
 * @param {string | {
 *   headerText?: string,
 *   classes?: string | string[],
 * }} [options] Header string, or `{ headerText, classes }` for wrapper classes
 *   (e.g. `modal-wide` for 80% width).
 */
export async function openModal(fragmentUrl, options) {
  if (!fragmentUrl) {
    throw new Error('openModal requires a fragment URL');
  }

  const { headerText, classes } = normalizeOpenOptions(options);
  openRequestId += 1;
  const requestId = openRequestId;

  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  // Loaded on click only — keeps fragment.js off the lazy listener path.
  // eslint-disable-next-line import/no-cycle
  const { loadFragment } = await import('../fragment/fragment.js');
  const fragment = await loadFragment(path);
  if (requestId !== openRequestId) return; // superseded by a newer open
  if (!fragment) {
    throw new Error(`Modal fragment could not be loaded: ${path}`);
  }

  const nodes = [...fragment.childNodes];

  if (activeModal?.isOpen()) {
    activeModal.setClasses(classes);
    activeModal.setContent(nodes, headerText);
    return;
  }

  activeModal = await createModal(nodes, headerText, classes);
  if (requestId !== openRequestId) {
    activeModal.dialog.close();
    return;
  }
  activeModal.showModal();
}

/**
 * Elements matching this selector open a modal.
 * Supported data attributes on the trigger:
 * - `href` / path: fragment to load
 * - `data-modal-title`: modal header text
 * - `data-modal-class`: space-separated classes on the modal wrapper
 *   (e.g. `modal-wide` → 80% width; default is 50%, transitions smoothly)
 *
 * @example
 * <!-- default 50% width -->
 * <a class="button secondary" href="/modals/details" data-modal-title="Details">Open</a>
 *
 * <!-- 80% width; if opened from inside an existing modal, width animates 50% → 80% -->
 * <a class="button secondary" href="/modals/compare" data-modal-title="Compare"
 *    data-modal-class="modal-wide">Compare</a>
 */
const MODAL_TRIGGER_SELECTOR = '.button.secondary, a.card-gallery-card';

let triggersBound = false;
let opening = false;

/**
 * Resolves a same-origin fragment path from a trigger element.
 * @param {Element} trigger
 * @returns {string|null}
 */
function getModalPath(trigger) {
  const href = trigger.getAttribute('href');
  if (!href || href.startsWith('#')) return null;

  let path = null;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    path = url.pathname;
  } catch {
    path = href.startsWith('/') ? href : null;
  }
  if (!path) return null;

  // Opt-in: /modals/ URLs, or an explicit data-modal* attribute.
  // Other secondary buttons (e.g. 404 "Go home") must keep navigating.
  const optedIn = path.startsWith('/modals/')
    || trigger.hasAttribute('data-modal')
    || trigger.hasAttribute('data-modal-title')
    || trigger.hasAttribute('data-modal-class');
  if (!optedIn) return null;

  return path;
}

/**
 * Reads wrapper classes from the trigger for modal UI variants.
 * @param {Element} trigger
 * @returns {string[]}
 */
function getModalClasses(trigger) {
  const raw = trigger.getAttribute('data-modal-class') || '';
  return raw.split(/\s+/).map((c) => c.trim()).filter(Boolean);
}

/**
 * Click handler via event delegation — works for triggers present at
 * page load and for HTML injected later (including inside an open modal).
 * @param {MouseEvent} event
 */
async function onDocumentClick(event) {
  const trigger = event.target.closest(MODAL_TRIGGER_SELECTOR);
  if (!trigger) return;
  if (event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (trigger.getAttribute('aria-disabled') === 'true') return;

  const path = getModalPath(trigger);
  if (!path) return;

  event.preventDefault();
  if (opening) return;

  const headerText = trigger.dataset.modalTitle
    || trigger.getAttribute('title')
    || trigger.textContent.trim();

  opening = true;
  trigger.setAttribute('aria-busy', 'true');
  try {
    await openModal(path, {
      headerText,
      classes: getModalClasses(trigger),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to open modal', error);
  } finally {
    opening = false;
    trigger.removeAttribute('aria-busy');
  }
}

/**
 * Binds modal triggers once for the lifetime of the page.
 * Safe to call more than once. Does not fetch CSS or fragments until a click.
 */
export function bindModalTriggers() {
  if (triggersBound) return;
  triggersBound = true;
  document.addEventListener('click', onDocumentClick);
}

import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';
import { OPEN_MODAL_EVENT } from '../../scripts/open-modal.js';

/*
  This is not a traditional block, so there is no decorate function.
  bindModalTriggers() is called once from scripts.js (lazy phase) and
  subscribes to `eds:open-modal`. Publishers (blocks, decorateButtons)
  dispatch that event; they must not import this file. Other code can still
  call createModal() and openModal() directly.

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

let subscribed = false;
let opening = false;

/**
 * @param {CustomEvent} event
 */
async function onOpenModalEvent(event) {
  const { fragmentUrl, headerText, classes } = event.detail || {};
  if (!fragmentUrl) return;
  if (opening) return;

  opening = true;
  try {
    await openModal(fragmentUrl, { headerText, classes });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to open modal', error);
  } finally {
    opening = false;
  }
}

/**
 * Subscribes once to `eds:open-modal`. Safe to call more than once.
 * Does not fetch CSS or fragments until an open is requested.
 */
export function bindModalTriggers() {
  if (subscribed) return;
  subscribed = true;
  document.addEventListener(OPEN_MODAL_EVENT, onOpenModalEvent);
}

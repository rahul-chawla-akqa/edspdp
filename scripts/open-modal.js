/**
 * Publisher API for opening modals. Dispatches `eds:open-modal` on document.
 * Blocks import this module — not modal.js — so modal/fragment stay on the lazy path.
 */

export const OPEN_MODAL_EVENT = 'eds:open-modal';

const boundTriggers = new WeakSet();

/**
 * Resolves a same-origin fragment path from a trigger element.
 * Opt-in: `/modals/` URLs, or an explicit data-modal* attribute.
 * Other links (e.g. 404 "Go home") keep navigating.
 * @param {Element} trigger
 * @returns {string|null}
 */
export function getModalPath(trigger) {
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
 * Asks the modal subscriber to open (or swap) a fragment.
 * @param {string} fragmentUrl
 * @param {string | { headerText?: string, classes?: string | string[] }} [options]
 */
export function requestOpenModal(fragmentUrl, options = {}) {
  if (!fragmentUrl) return;

  const headerText = typeof options === 'string'
    ? options
    : (options.headerText || '');
  const rawClasses = typeof options === 'string' ? [] : (options.classes || []);
  const classes = (Array.isArray(rawClasses) ? rawClasses : String(rawClasses).split(/\s+/))
    .map((c) => c.trim())
    .filter(Boolean);

  document.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT, {
    bubbles: true,
    detail: { fragmentUrl, headerText, classes },
  }));
}

/**
 * Opens a modal on click when the element is an opted-in modal trigger.
 * Modifier-clicks keep native navigation. Safe to call more than once.
 * @param {Element} element
 */
export function bindOpenModalOnClick(element) {
  if (!element || boundTriggers.has(element)) return;
  if (!getModalPath(element)) return;

  boundTriggers.add(element);
  element.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (element.getAttribute('aria-disabled') === 'true') return;

    const path = getModalPath(element);
    if (!path) return;

    event.preventDefault();
    const headerText = element.dataset.modalTitle
      || element.getAttribute('title')
      || element.textContent.trim();
    requestOpenModal(path, {
      headerText,
      classes: getModalClasses(element),
    });
  });
}

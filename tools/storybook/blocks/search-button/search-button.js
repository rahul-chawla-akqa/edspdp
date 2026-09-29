import { decorateIcons } from '../../scripts/aem.js';
import { bindOpenModalOnClick } from '../../scripts/open-modal.js';

/**
 * @param {Element} parent
 * @param {string} iconName
 * @returns {HTMLSpanElement}
 */
function createIconWrap(parent, iconName) {
  const wrap = document.createElement('span');
  wrap.className = `search-button-${iconName === 'search' ? 'search' : 'go'}`;
  wrap.setAttribute('aria-hidden', 'true');

  const icon = document.createElement('span');
  icon.className = `icon icon-${iconName}`;
  wrap.append(icon);
  parent.append(wrap);
  return wrap;
}

/**
 * Decorates the search-bar styled control. Click opens a fragment in a modal.
 * @param {Element} block
 */
export default function decorate(block) {
  const link = block.querySelector('a[href]');
  const href = link?.getAttribute('href') || '';
  const label = (link?.textContent || block.textContent || '').trim();
  const modalTitle = link?.getAttribute('title') || label;
  const isWide = block.classList.contains('wide');

  const trigger = document.createElement(href ? 'a' : 'div');
  trigger.className = 'search-button-control';
  if (href) {
    trigger.href = href;
    trigger.dataset.modalTitle = modalTitle;
    if (isWide) trigger.dataset.modalClass = 'modal-wide';
    bindOpenModalOnClick(trigger);
  }
  if (label) trigger.setAttribute('aria-label', label);

  createIconWrap(trigger, 'search');

  const text = document.createElement('span');
  text.className = 'search-button-label';
  text.textContent = label;
  trigger.append(text);

  createIconWrap(trigger, 'arrow');

  block.replaceChildren(trigger);
  decorateIcons(block);
}

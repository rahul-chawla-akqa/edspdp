import { createIcon } from '../../scripts/ui/icon.js';
import { bindOpenModalOnClick } from '../../scripts/open-modal.js';

/**
 * @param {Element} parent
 * @param {string} iconName
 * @param {string} wrapClass
 */
async function appendIconWrap(parent, iconName, wrapClass) {
  const wrap = document.createElement('span');
  wrap.className = wrapClass;
  wrap.setAttribute('aria-hidden', 'true');

  const icon = await createIcon(iconName);
  if (icon) wrap.append(icon);
  parent.append(wrap);
}

/**
 * Decorates the search-bar styled control. Click opens a fragment in a modal.
 * @param {Element} block
 */
export default async function decorate(block) {
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

  await appendIconWrap(trigger, 'search', 'search-button-search');

  const text = document.createElement('span');
  text.className = 'search-button-label';
  text.textContent = label;
  trigger.append(text);

  await appendIconWrap(trigger, 'arrow', 'search-button-go');

  block.replaceChildren(trigger);
}

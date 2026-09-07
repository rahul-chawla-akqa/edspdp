import { createOptimizedPicture } from '../../scripts/aem.js';
import { bindOpenModalOnClick } from '../../scripts/open-modal.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const RATIO_CLASSES = ['ratio-1-1', 'ratio-2-1', 'ratio-1-2'];
const DEFAULT_RATIO = RATIO_CLASSES[0];
const CLASS_TOKEN = /^[a-z0-9][a-z0-9-]*$/i;

/**
 * @param {Element | undefined} cell
 * @returns {string}
 */
function cellText(cell) {
  return cell?.textContent.trim() || '';
}

/**
 * Container items render `classes` as a comma-separated value list in a cell
 * (e.g. "gallery-card, ratio-1-2"), not as HTML classes on the row.
 * @param {string} text
 * @returns {string[]}
 */
function parseClassTokens(text) {
  const tokens = text.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length || !tokens.every((token) => CLASS_TOKEN.test(token))) return [];
  if (!tokens.some((token) => RATIO_CLASSES.includes(token))) return [];
  return tokens;
}

/**
 * @param {Element} cell
 * @returns {boolean}
 */
function isClassListCell(cell) {
  return parseClassTokens(cellText(cell)).length > 0;
}

/**
 * @param {Element} row
 * @returns {string}
 */
function getRatioClass(row) {
  const fromCells = [...row.children].flatMap((cell) => parseClassTokens(cellText(cell)));
  const applied = [...row.classList, ...fromCells]
    .filter((className) => RATIO_CLASSES.includes(className));
  if (!applied.length) return DEFAULT_RATIO;
  const authored = applied.filter((className) => className !== DEFAULT_RATIO);
  const resolved = authored.length ? authored : applied;
  return resolved[resolved.length - 1];
}

/**
 * @param {Element} row
 * @returns {string}
 */
function overlayTitleFrom(row) {
  const cell = [...row.children].find(
    (child) => !child.querySelector('picture')
      && !child.querySelector('a[href]')
      && !isClassListCell(child),
  );
  return cellText(cell);
}

/**
 * Decorates the card gallery mosaic. Each authored row becomes a modal trigger.
 * Empty items are kept in Universal Editor so newly added cards remain selectable.
 * @param {Element} block
 */
export default function decorate(block) {
  const isAuthoring = block.hasAttribute('data-aue-resource')
    || [...block.children].some((row) => row.hasAttribute('data-aue-resource'));

  const cards = [...block.children].reduce((list, row) => {
    const link = row.querySelector('a[href]');
    const href = link?.getAttribute('href');
    if (!href && !isAuthoring) return list;

    const overlayTitle = overlayTitleFrom(row);
    const modalTitle = link?.getAttribute('title') || overlayTitle;
    const picture = row.querySelector('picture');
    const img = picture?.querySelector('img');

    const card = document.createElement(href ? 'a' : 'div');
    card.className = `card-gallery-card ${getRatioClass(row)}`;
    if (href) {
      card.href = href;
      card.dataset.modalTitle = modalTitle;
      bindOpenModalOnClick(card);
    }
    if (overlayTitle) card.setAttribute('aria-label', overlayTitle);

    moveInstrumentation(row, card);

    if (img) {
      const optimized = createOptimizedPicture(
        img.src,
        img.alt || overlayTitle,
        false,
        [{ width: '750' }],
      );
      moveInstrumentation(img, optimized.querySelector('img'));
      card.append(optimized);
    } else if (picture) {
      card.append(picture);
    }

    if (overlayTitle) {
      const label = document.createElement('span');
      label.className = 'card-gallery-title';
      label.textContent = overlayTitle;
      card.append(label);
    }

    list.push(card);
    return list;
  }, []);

  block.replaceChildren(...cards);
}

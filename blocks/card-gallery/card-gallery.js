import { createOptimizedPicture } from '../../scripts/aem.js';
import { bindOpenModalOnClick } from '../../scripts/open-modal.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const RATIO_CLASSES = ['ratio-1-1', 'ratio-2-1', 'ratio-1-2'];
const DEFAULT_RATIO = RATIO_CLASSES[0];

/**
 * Resolves a single exclusive ratio class.
 * Authoring can leave the template default (`ratio-1-1`) on the row after another
 * ratio is selected; prefer the last non-default ratio in that case.
 * @param {Element} row
 * @returns {string}
 */
function getRatioClass(row) {
  const applied = [...row.classList].filter((className) => RATIO_CLASSES.includes(className));
  if (!applied.length) return DEFAULT_RATIO;
  const authored = applied.filter((className) => className !== DEFAULT_RATIO);
  return (authored.length ? authored : applied).at(-1);
}

/**
 * @param {Element | undefined} cell
 * @returns {string}
 */
function cellText(cell) {
  return cell?.textContent.trim() || '';
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

    const textCells = [...row.children].filter(
      (cell) => !cell.querySelector('picture') && !cell.querySelector('a[href]'),
    );
    const overlayTitle = cellText(textCells[0]);
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

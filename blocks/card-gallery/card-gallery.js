import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const RATIO_CLASSES = ['ratio-1-1', 'ratio-2-1', 'ratio-1-2'];

/**
 * @param {Element} row
 * @returns {string}
 */
function getRatioClass(row) {
  return RATIO_CLASSES.find((className) => row.classList.contains(className)) || 'ratio-1-1';
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

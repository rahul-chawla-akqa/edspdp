import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const CALENDAR_LAYOUT = 'layout-equal-3';

/**
 * @param {Element | undefined} cell
 * @returns {string}
 */
function cellText(cell) {
  return cell?.textContent.trim() || '';
}

/**
 * Leading rows of a container block hold the block level fields, one cell each.
 * Card rows always carry a cell per item field, so the first multi-cell row
 * marks the end of the header.
 * @param {Element} block
 * @returns {{ headerRows: Element[], cardRows: Element[] }}
 */
function splitRows(block) {
  const rows = [...block.children];
  const firstCard = rows.findIndex((row) => row.children.length > 1);
  if (firstCard === -1) return { headerRows: rows, cardRows: [] };
  return { headerRows: rows.slice(0, firstCard), cardRows: rows.slice(firstCard) };
}

/**
 * Builds the eyebrow, heading and call to action shown above the grid.
 * @param {Element[]} rows eyebrow, heading and link rows, in model field order
 * @returns {Element | null}
 */
function buildHeader(rows) {
  const [eyebrowRow, headingRow, linkRow] = rows;
  const eyebrow = cellText(eyebrowRow);
  const headingSource = headingRow?.querySelector('h1, h2, h3, h4, h5, h6');
  const headingText = cellText(headingRow);
  const link = linkRow?.querySelector('a[href]');
  if (!eyebrow && !headingText && !link) return null;

  const header = document.createElement('div');
  header.className = 'bento-grid-header';

  const text = document.createElement('div');
  text.className = 'bento-grid-intro';

  if (eyebrow) {
    const label = document.createElement('p');
    label.className = 'bento-grid-eyebrow';
    label.textContent = eyebrow;
    moveInstrumentation(eyebrowRow, label);
    text.append(label);
  }

  if (headingText) {
    const heading = headingSource || document.createElement('h2');
    heading.classList.add('bento-grid-heading');
    if (!headingSource) heading.textContent = headingText;
    moveInstrumentation(headingRow, heading);
    text.append(heading);
  }

  header.append(text);

  if (link) {
    link.className = 'bento-grid-cta';
    link.textContent = link.textContent.trim() || link.title;
    moveInstrumentation(linkRow, link);
    header.append(link);
  }

  return header;
}

/**
 * @param {string} value authored date, for example "17 July 2026"
 * @returns {{ month: string, day: string, weekday: string } | null}
 */
function parseDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    month: parsed.toLocaleDateString('en-GB', { month: 'short' }),
    day: `${parsed.getDate()}`,
    weekday: parsed.toLocaleDateString('en-GB', { weekday: 'short' }),
  };
}

/**
 * Renders the date as a stacked calendar badge when the layout asks for one and
 * the value is parsable, otherwise leaves it as plain text.
 * @param {Element} date the authored date paragraph
 * @param {boolean} asCalendar
 * @returns {Element}
 */
function buildDate(date, asCalendar) {
  date.classList.add('bento-grid-date');
  const parts = asCalendar ? parseDate(date.textContent.trim()) : null;
  if (!parts) return date;

  date.classList.add('bento-grid-date-badge');
  date.replaceChildren(...['month', 'day', 'weekday'].map((part) => {
    const span = document.createElement('span');
    span.className = `bento-grid-date-${part}`;
    span.textContent = parts[part];
    return span;
  }));
  return date;
}

/**
 * The item model renders three cells: image, grouped card text, link. Rows with
 * fewer cells are matched on their content instead, so shorter authored markup
 * still resolves.
 * @param {Element} row
 * @returns {{ pictureCell: Element, textCell: Element, linkCell: Element }}
 */
function readCells(row) {
  const cells = [...row.children];
  if (cells.length >= 3) {
    const [pictureCell, textCell, linkCell] = cells;
    return { pictureCell, textCell, linkCell };
  }

  const pictureCell = cells.find((cell) => cell.querySelector('picture'));
  const linkCell = cells.find((cell) => cell.querySelector('a[href]'));
  const textCell = cells.find((cell) => cell !== pictureCell && cell !== linkCell);
  return { pictureCell, textCell, linkCell };
}

/**
 * The grouped text cell holds the chip, the title heading and the date, in that
 * order. The heading is the anchor: text before it is the chip, text after it
 * is the date.
 * @param {Element | undefined} textCell
 * @returns {{ chip: Element | undefined, heading: Element | undefined, date: Element | undefined }}
 */
function readCardText(textCell) {
  const nodes = [...(textCell?.children || [])];
  const index = nodes.findIndex((node) => /^H[1-6]$/.test(node.tagName));
  if (index === -1) return { chip: undefined, heading: undefined, date: undefined };

  const isText = (node) => node.tagName === 'P';
  return {
    chip: nodes.slice(0, index).find(isText),
    heading: nodes[index],
    date: nodes.slice(index + 1).find(isText),
  };
}

/**
 * @param {Element} row
 * @param {boolean} calendarDates
 * @returns {Element}
 */
function buildCard(row, calendarDates) {
  const { pictureCell, textCell, linkCell } = readCells(row);
  const { chip, heading, date } = readCardText(textCell);
  const title = cellText(heading);

  const item = document.createElement('li');
  item.className = 'bento-grid-card';
  moveInstrumentation(row, item);

  const img = pictureCell?.querySelector('img');
  if (img) {
    const picture = createOptimizedPicture(img.src, img.alt || title, false, [{ width: '750' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    item.append(picture);
  }

  if (chip) {
    chip.className = 'bento-grid-chip';
    item.append(chip);
  }

  const body = document.createElement('div');
  body.className = 'bento-grid-body';

  if (heading) {
    heading.classList.add('bento-grid-title');
    body.append(heading);
  }

  if (date) body.append(buildDate(date, calendarDates));

  item.append(body);

  const link = linkCell?.querySelector('a[href]');
  if (link) {
    const overlay = document.createElement('a');
    overlay.className = 'bento-grid-link';
    overlay.href = link.getAttribute('href');
    overlay.setAttribute('aria-label', title || cellText(linkCell));
    item.append(overlay);
  }

  return item;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const { headerRows, cardRows } = splitRows(block);
  const calendarDates = block.classList.contains(CALENDAR_LAYOUT);

  const header = buildHeader(headerRows);

  const list = document.createElement('ul');
  list.className = 'bento-grid-cards';
  list.append(...cardRows.map((row) => buildCard(row, calendarDates)));

  block.replaceChildren(...[header, list].filter(Boolean));
}

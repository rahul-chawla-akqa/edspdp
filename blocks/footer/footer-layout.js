const NAV_COLUMN_SLOTS = 5;

const ITEM_TYPES = ['nav-column', 'logo', 'legal', 'social'];

const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', match: /facebook\./i },
  { key: 'x', label: 'X', match: /(^|\/\/)(www\.)?(x|twitter)\./i },
  { key: 'instagram', label: 'Instagram', match: /instagram\./i },
  { key: 'linkedin', label: 'LinkedIn', match: /linkedin\./i },
  { key: 'youtube', label: 'YouTube', match: /(youtube\.|youtu\.be)/i },
];

function cellText(cell) {
  if (!cell) return '';
  return (cell.textContent || '').trim();
}

/**
 * Each footer child model carries a fixed `type` property, so the delivered markup
 * starts every row with the item type. That keeps parsing identical in the editor,
 * on preview, and on live, where authoring attributes are absent.
 * @param {Element} row block row
 * @returns {string} item type, or an empty string when the row is not a footer item
 */
function rowType(row) {
  const token = cellText(row.firstElementChild).toLowerCase();
  return ITEM_TYPES.includes(token) ? token : '';
}

function contentCells(row) {
  const cells = [...row.children];
  return rowType(row) ? cells.slice(1) : cells;
}

function anchorsIn(element) {
  if (!element) return [];
  return [...element.querySelectorAll('a[href]')]
    .filter((anchor) => !/^javascript:/i.test(anchor.getAttribute('href')));
}

function styleAnchor(anchor, className, text) {
  anchor.className = className;
  if (text) anchor.textContent = text;
  if (!anchor.textContent.trim()) anchor.textContent = anchor.getAttribute('href');
  return anchor;
}

function buildNavColumn(row) {
  const column = document.createElement('div');
  column.className = 'footer-nav-column';

  const cells = contentCells(row);
  const [headingCell, ...linkCells] = cells;
  const headingText = cellText(headingCell);
  if (headingText) {
    const heading = document.createElement('p');
    heading.className = 'footer-nav-heading';
    heading.textContent = headingText;
    column.append(heading);
  }

  const anchors = linkCells.flatMap((cell) => anchorsIn(cell));
  if (anchors.length) {
    const list = document.createElement('ul');
    list.className = 'footer-nav-links';
    anchors.forEach((anchor) => {
      const item = document.createElement('li');
      item.append(styleAnchor(anchor, 'footer-nav-link'));
      list.append(item);
    });
    column.append(list);
  }

  return column;
}

function buildBrand(row) {
  const brand = document.createElement('div');
  brand.className = 'footer-brand';

  const media = row.querySelector('picture') || row.querySelector('img');
  if (!media) return brand;

  const [logoLink] = anchorsIn(row);
  if (logoLink) {
    logoLink.className = 'footer-logo-link';
    logoLink.textContent = '';
    logoLink.append(media);
    brand.append(logoLink);
  } else {
    brand.append(media);
  }

  return brand;
}

function buildLegal(row) {
  const legal = document.createElement('div');
  legal.className = 'footer-legal';

  const cells = contentCells(row);
  const copyrightText = cellText(cells.find((cell) => !anchorsIn(cell).length));
  if (copyrightText) {
    const copyright = document.createElement('p');
    copyright.className = 'footer-copyright';
    copyright.textContent = copyrightText;
    legal.append(copyright);
  }

  const anchors = anchorsIn(row);
  if (anchors.length) {
    const links = document.createElement('div');
    links.className = 'footer-legal-links';
    anchors.forEach((anchor) => links.append(styleAnchor(anchor, 'footer-legal-link')));
    legal.append(links);
  }

  return legal;
}

function buildSocial(row) {
  const social = document.createElement('div');
  social.className = 'footer-social';

  const anchors = anchorsIn(row);
  if (!anchors.length) return social;

  const list = document.createElement('ul');
  list.className = 'footer-social-list';
  anchors.forEach((anchor, index) => {
    const href = anchor.getAttribute('href');
    const network = SOCIAL_NETWORKS.find(({ match }) => match.test(href))
      || SOCIAL_NETWORKS[index]
      || { key: 'link', label: anchor.textContent.trim() || 'Social' };
    const item = document.createElement('li');
    const link = styleAnchor(anchor, `footer-social-link footer-social-${network.key}`, network.label);
    link.setAttribute('aria-label', network.label);
    item.append(link);
    list.append(item);
  });
  social.append(list);

  return social;
}

function applySectionBackground(section, shell) {
  const background = section?.dataset?.backgroundImage;
  if (!background) return;
  shell.style.setProperty('--footer-background-image', `url("${background}")`);
}

/**
 * Rebuilds the authored rows of a footer block into the footer layout.
 * @param {Element} block the footer block holding authored item rows
 * @param {Function} [moveInstrumentation] carries authoring attributes to the new elements
 * @returns {Element} the footer shell, already appended to the block
 */
function renderFooter(block, moveInstrumentation) {
  const rows = [...block.children];
  const navRows = rows.filter((row) => rowType(row) === 'nav-column').slice(0, NAV_COLUMN_SLOTS);
  const rowOfType = (type) => rows.find((row) => rowType(row) === type);

  const shell = document.createElement('div');
  shell.className = 'footer-shell';

  const nav = document.createElement('nav');
  nav.className = 'footer-nav';
  nav.setAttribute('aria-label', 'Footer');
  [...Array(NAV_COLUMN_SLOTS)].forEach((unused, index) => {
    const slot = document.createElement('div');
    slot.className = 'footer-nav-slot';
    const row = navRows[index];
    if (row) {
      const column = buildNavColumn(row);
      if (moveInstrumentation) moveInstrumentation(row, column);
      slot.append(column);
    }
    nav.append(slot);
  });
  shell.append(nav);

  const logoRow = rowOfType('logo');
  if (logoRow) {
    const brand = buildBrand(logoRow);
    if (moveInstrumentation) moveInstrumentation(logoRow, brand);
    shell.append(brand);
  }

  const bar = document.createElement('div');
  bar.className = 'footer-bar';
  const legalRow = rowOfType('legal');
  if (legalRow) {
    const legal = buildLegal(legalRow);
    if (moveInstrumentation) moveInstrumentation(legalRow, legal);
    bar.append(legal);
  }
  const socialRow = rowOfType('social');
  if (socialRow) {
    const social = buildSocial(socialRow);
    if (moveInstrumentation) moveInstrumentation(socialRow, social);
    bar.append(social);
  }
  if (bar.childElementCount) shell.append(bar);

  block.replaceChildren(shell);
  return shell;
}

export {
  NAV_COLUMN_SLOTS,
  rowType,
  applySectionBackground,
  renderFooter,
};

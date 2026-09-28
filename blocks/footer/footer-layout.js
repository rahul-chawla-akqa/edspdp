const NAV_COLUMN_SLOTS = 5;

const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
];

function cellText(cell) {
  if (!cell) return '';
  return (cell.innerText || cell.textContent || '').trim();
}

function rowKind(row) {
  const resource = row.querySelector('[data-aue-resource]');
  const path = resource?.getAttribute('data-aue-resource') || '';
  if (path.includes('footer-nav-column')) return 'nav-column';
  if (path.includes('footer-logo')) return 'logo';
  if (path.includes('footer-legal')) return 'legal';
  if (path.includes('footer-social')) return 'social';

  const label = cellText(row.firstElementChild).toLowerCase();
  if (label.includes('nav column')) return 'nav-column';
  if (label.includes('footer logo') || (label.includes('logo') && !label.includes('nav'))) return 'logo';
  if (label.includes('legal')) return 'legal';
  if (label.includes('social')) return 'social';
  return 'unknown';
}

function dataCells(row) {
  const cells = [...row.children];
  const kind = rowKind(row);
  if (kind !== 'unknown' && cells.length > 1) {
    const first = cellText(cells[0]).toLowerCase();
    if (first.includes('footer')) return cells.slice(1);
  }
  return cells;
}

function extractAnchors(container) {
  if (!container) return [];
  return [...container.querySelectorAll('a[href]')].map((anchor) => ({
    href: anchor.getAttribute('href'),
    text: anchor.textContent.trim() || anchor.getAttribute('href'),
    anchor,
  })).filter((entry) => entry.href && !/^javascript:/i.test(entry.href));
}

function buildTextLink({ href, text, anchor }, className, moveInstrumentation) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  link.className = className;
  if (anchor && moveInstrumentation) moveInstrumentation(anchor, link);
  return link;
}

function buildNavColumn(row, moveInstrumentation) {
  const column = document.createElement('div');
  column.className = 'footer-nav-column';
  if (moveInstrumentation) moveInstrumentation(row, column);

  const cells = dataCells(row);
  const headingText = cellText(cells[0]);
  if (headingText) {
    const heading = document.createElement('p');
    heading.className = 'footer-nav-heading';
    heading.textContent = headingText;
    const headingCell = cells[0];
    if (headingCell && moveInstrumentation) moveInstrumentation(headingCell, heading);
    column.append(heading);
  }

  const list = document.createElement('ul');
  list.className = 'footer-nav-links';
  const linkCells = cells.slice(1);
  const anchors = linkCells.length
    ? linkCells.flatMap((cell) => extractAnchors(cell))
    : extractAnchors(row);

  anchors.forEach(({ href, text, anchor }) => {
    const item = document.createElement('li');
    item.append(buildTextLink({ href, text, anchor }, 'footer-nav-link', moveInstrumentation));
    list.append(item);
  });

  if (list.children.length) column.append(list);
  return column;
}

function buildLogo(row, moveInstrumentation) {
  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  if (moveInstrumentation) moveInstrumentation(row, brand);

  const logoLink = extractAnchors(row)[0];
  const media = row.querySelector('picture') || row.querySelector('img');
  if (!media) return brand;

  const wrap = document.createElement(logoLink ? 'a' : 'div');
  if (logoLink) {
    wrap.href = logoLink.href;
    wrap.className = 'footer-logo-link';
    if (moveInstrumentation) moveInstrumentation(logoLink.anchor, wrap);
  }

  if (moveInstrumentation) moveInstrumentation(media, media);
  wrap.append(media);
  brand.append(wrap);
  return brand;
}

function buildLegal(row, moveInstrumentation) {
  const legal = document.createElement('div');
  legal.className = 'footer-legal';
  if (moveInstrumentation) moveInstrumentation(row, legal);

  const cells = dataCells(row);
  const copyrightCell = cells.find((cell) => !cell.querySelector('a[href]') && cellText(cell));
  const copyrightText = cellText(copyrightCell) || cellText(cells[0]);

  if (copyrightText) {
    const copy = document.createElement('p');
    copy.className = 'footer-copyright';
    copy.textContent = copyrightText;
    if (copyrightCell && moveInstrumentation) moveInstrumentation(copyrightCell, copy);
    legal.append(copy);
  }

  const linksWrap = document.createElement('div');
  linksWrap.className = 'footer-legal-links';
  extractAnchors(row).forEach(({ href, text, anchor }) => {
    linksWrap.append(buildTextLink({ href, text, anchor }, 'footer-legal-link', moveInstrumentation));
  });
  if (linksWrap.children.length) legal.append(linksWrap);

  return legal;
}

function buildSocial(row, moveInstrumentation) {
  const social = document.createElement('div');
  social.className = 'footer-social';
  if (moveInstrumentation) moveInstrumentation(row, social);

  const list = document.createElement('ul');
  list.className = 'footer-social-list';

  const anchors = extractAnchors(row);
  anchors.forEach(({ href, text, anchor }, index) => {
    const network = SOCIAL_NETWORKS[index] || { key: 'link', label: text || 'Social' };
    const item = document.createElement('li');
    const link = buildTextLink(
      { href, text: network.label, anchor },
      `footer-social-link footer-social-${network.key}`,
      moveInstrumentation,
    );
    link.setAttribute('aria-label', network.label);
    item.append(link);
    list.append(item);
  });

  if (list.children.length) social.append(list);
  return social;
}

function applySectionBackground(section, shell) {
  const background = section?.dataset?.backgroundImage;
  if (!background) return;
  shell.style.setProperty('--footer-background-image', `url("${background}")`);
  shell.dataset.backgroundImage = background;
  const alt = section.dataset.backgroundImageAlt;
  if (alt) shell.dataset.backgroundImageAlt = alt;
}

function renderFooterContent(shell, sourceBlock, moveInstrumentation) {
  const rows = [...sourceBlock.children];
  const navRows = rows.filter((row) => rowKind(row) === 'nav-column').slice(0, NAV_COLUMN_SLOTS);
  const logoRow = rows.find((row) => rowKind(row) === 'logo');
  const legalRow = rows.find((row) => rowKind(row) === 'legal');
  const socialRow = rows.find((row) => rowKind(row) === 'social');

  const nav = document.createElement('nav');
  nav.className = 'footer-nav';
  nav.setAttribute('aria-label', 'Footer');

  [...Array(NAV_COLUMN_SLOTS)].forEach((_, index) => {
    const slot = document.createElement('div');
    slot.className = 'footer-nav-slot';
    if (navRows[index]) slot.append(buildNavColumn(navRows[index], moveInstrumentation));
    nav.append(slot);
  });
  shell.append(nav);

  if (logoRow) shell.append(buildLogo(logoRow, moveInstrumentation));

  const bar = document.createElement('div');
  bar.className = 'footer-bar';
  if (legalRow) bar.append(buildLegal(legalRow, moveInstrumentation));
  if (socialRow) bar.append(buildSocial(socialRow, moveInstrumentation));
  if (bar.childElementCount) shell.append(bar);
}

export {
  NAV_COLUMN_SLOTS,
  rowKind,
  applySectionBackground,
  renderFooterContent,
};

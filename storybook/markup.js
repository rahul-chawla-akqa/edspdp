/**
 * Build EDS pre-decoration row markup (one row = one outer div, each cell a child div).
 * @param {...string} cells
 * @returns {string}
 */
export function row(...cells) {
  return `<div>${cells.map((cell) => `<div>${cell}</div>`).join('')}</div>`;
}

/**
 * @param {string} src
 * @param {string} [alt]
 * @returns {string}
 */
export function picture(src, alt = '') {
  return `<picture><img src="${src}" alt="${alt}"></picture>`;
}

/**
 * @param {string} href
 * @param {string} text
 * @param {string} [title]
 * @returns {string}
 */
export function link(href, text, title = '') {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr}>${text}</a>`;
}

export const images = {
  hero: '/storybook-fixtures/hero.svg',
  card1: '/storybook-fixtures/card-1.svg',
  card2: '/storybook-fixtures/card-2.svg',
  card3: '/storybook-fixtures/card-3.svg',
  product1: '/storybook-fixtures/product-1.svg',
  product2: '/storybook-fixtures/product-2.svg',
};

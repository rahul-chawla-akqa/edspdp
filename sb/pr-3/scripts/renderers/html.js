/*
 * Markup helpers shared by the server-side composer and client-side block hydration.
 *
 * Renderers emit the *pre-decoration* block content only: a sequence of row divs, exactly
 * what an author would have produced. Block JS then decorates it like any other block, so
 * server-composed and client-hydrated pages converge on identical final DOM.
 *
 * AEM strips span tags, data-* attributes and inline styles when ingesting BYOM markup,
 * so renderers must stay within plain semantic elements.
 */

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

/** Builds one block row; each argument becomes a cell. */
export function row(...cells) {
  return `<div>${cells.map((cell) => `<div>${cell}</div>`).join('')}</div>`;
}

export function paragraph(value) {
  const text = escapeHtml(value);
  return text ? `<p>${text}</p>` : '';
}

/**
 * Absolute image URLs are required: AEM downloads referenced images into the media bus
 * during preview, so the source must be publicly reachable at that moment.
 */
export function image(src, alt, eager = false) {
  if (!src) return '';
  const loading = eager ? 'eager' : 'lazy';
  return `<picture><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="${loading}"></picture>`;
}

export function list(items) {
  const entries = items.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`);
  return entries.length ? `<ul>${entries.join('')}</ul>` : '';
}

/** Drops rows whose value resolved to nothing, so absent API fields leave no empty rows. */
export function labelledRows(pairs) {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => row(escapeHtml(label), escapeHtml(value)))
    .join('');
}

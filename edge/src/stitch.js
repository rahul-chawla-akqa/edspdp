import renderPostBody from '../../scripts/renderers/post-body.js';

export const BLOCK_CLASS = 'post-body';
export const RENDERED_CLASS = 'api-rendered';
export const API_ORIGIN = 'https://jsonplaceholder.typicode.com';

const OPEN_TAG = /<div\b([^>]*\bclass="[^"]*\bpost-body\b[^"]*"[^>]*)>/i;

/**
 * @param {string} pathname
 * @returns {string|null} numeric post id from /posts/post-N
 */
export function parsePostId(pathname) {
  const path = String(pathname || '').split('?')[0].replace(/\.html$/i, '');
  const match = path.match(/^\/posts\/post-(\d+)\/?$/);
  return match ? match[1] : null;
}

export function apiUrl(id) {
  return `${API_ORIGIN}/posts/${encodeURIComponent(id)}`;
}

function findMatchingDivClose(html, afterOpenTag) {
  let depth = 1;
  const tokens = /<\/?div\b[^>]*>/gi;
  tokens.lastIndex = afterOpenTag;
  let token = tokens.exec(html);
  while (token) {
    if (token[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) {
        return { closeStart: token.index, end: token.index + token[0].length };
      }
    } else if (!/\/>$/.test(token[0])) {
      depth += 1;
    }
    token = tokens.exec(html);
  }
  return null;
}

function locateBlock(html) {
  const open = OPEN_TAG.exec(html);
  if (!open) return null;
  const innerStart = open.index + open[0].length;
  const close = findMatchingDivClose(html, innerStart);
  if (!close) return null;
  return {
    openStart: open.index,
    innerStart,
    end: close.end,
    attrs: open[1],
    inner: html.slice(innerStart, close.closeStart),
  };
}

/** Numeric id authored in the placeholder, if any. */
export function blockOverrideId(html) {
  const located = locateBlock(html);
  if (!located) return null;
  const text = located.inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return /^\d+$/.test(text) ? text : null;
}

export function renderRows(data) {
  return renderPostBody(data);
}

/**
 * Replaces the first .post-body block inner HTML and adds api-rendered.
 * @returns {string|null} rewritten document, or null when the placeholder is missing
 */
export function fillPostBlock(html, innerMarkup) {
  const located = locateBlock(html);
  if (!located || !innerMarkup) return null;

  const classMatch = located.attrs.match(/\bclass="([^"]*)"/i);
  const classes = classMatch ? classMatch[1].trim().split(/\s+/) : [BLOCK_CLASS];
  if (!classes.includes(RENDERED_CLASS)) classes.push(RENDERED_CLASS);

  const opening = `<div class="${classes.join(' ')}">`;
  return `${html.slice(0, located.openStart)}${opening}${innerMarkup}</div>${html.slice(located.end)}`;
}

export function cacheHeaders(id) {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=60',
    'surrogate-control': 'max-age=3600',
    'surrogate-key': `posts post-${id}`,
  };
}

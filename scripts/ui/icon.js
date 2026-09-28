/**
 * Shared icon primitive. Icons live in /icons as SVG assets; this module fetches,
 * normalizes, caches, and inlines them so fill inherits via currentColor.
 */

export const ICON_CLASS = 'icon';

/** icon and class names are limited to kebab-case tokens */
const TOKEN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** @type {Map<string, Promise<string>>} */
const svgCache = new Map();

/**
 * @param {string | string[] | undefined} classes
 * @returns {string[]}
 */
function toClassNames(classes) {
  const list = Array.isArray(classes) ? classes : `${classes ?? ''}`.split(/\s+/);
  return list.map((name) => `${name}`.trim()).filter((name) => TOKEN.test(name));
}

/**
 * @param {string} name
 * @returns {string | null}
 */
function iconNameFromSpan(span) {
  if (!span.classList.contains(ICON_CLASS)) return null;
  const match = [...span.classList].find((cls) => cls.startsWith(`${ICON_CLASS}-`));
  return match ? match.slice(ICON_CLASS.length + 1) : null;
}

/**
 * @param {string} rawSvg
 * @returns {string}
 */
export function normalizeSvg(rawSvg) {
  const trimmed = `${rawSvg ?? ''}`.trim().replace(/<\?xml[^?]*\?>/i, '');
  const template = document.createElement('template');
  template.innerHTML = trimmed;
  const svg = template.content.querySelector('svg');
  if (!svg) return '';

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  svg.querySelectorAll('[fill]').forEach((node) => {
    const fill = `${node.getAttribute('fill')}`.trim().toLowerCase();
    if (fill && fill !== 'none' && fill !== 'currentcolor') {
      node.setAttribute('fill', 'currentColor');
    }
  });

  svg.querySelectorAll('path, circle, rect, polygon, polyline, ellipse').forEach((node) => {
    if (!node.hasAttribute('fill')) node.setAttribute('fill', 'currentColor');
  });

  return svg.outerHTML;
}

/**
 * @param {string} name
 * @returns {Promise<string | null>}
 */
async function loadSvg(name) {
  if (!TOKEN.test(name)) return null;
  if (!svgCache.has(name)) {
    const base = window.hlx?.codeBasePath ?? '';
    const url = `${base}/icons/${name}.svg`;
    svgCache.set(name, fetch(url).then(async (resp) => {
      if (!resp.ok) throw new Error(`icon fetch failed: ${name}`);
      const raw = await resp.text();
      const normalized = normalizeSvg(raw);
      if (!normalized) throw new Error(`icon invalid: ${name}`);
      return normalized;
    }));
  }

  try {
    return await svgCache.get(name);
  } catch {
    svgCache.delete(name);
    return null;
  }
}

/**
 * @param {HTMLElement} span
 * @param {string} svgMarkup
 */
function inlineSvg(span, svgMarkup) {
  span.querySelectorAll('img').forEach((img) => img.remove());
  span.innerHTML = svgMarkup;
}

/**
 * Creates an icon element with inline SVG. Returns null for an invalid name.
 * @param {string} name icon basename from /icons
 * @param {object} [options]
 * @param {boolean} [options.decorative] hides the icon from assistive technology
 * @param {string} [options.label] when set and not decorative, exposes the icon to AT
 * @param {string | string[]} [options.classes] placement classes owned by the caller
 * @returns {Promise<HTMLSpanElement | null>}
 */
export async function createIcon(name, { decorative = true, label, classes = [] } = {}) {
  if (!TOKEN.test(name)) return null;

  const svgMarkup = await loadSvg(name);
  if (!svgMarkup) return null;

  const span = document.createElement('span');
  span.classList.add(ICON_CLASS, `${ICON_CLASS}-${name}`);
  span.classList.add(...toClassNames(classes));

  const text = `${label ?? ''}`.trim();
  if (decorative || !text) {
    span.setAttribute('aria-hidden', 'true');
    span.removeAttribute('aria-label');
  } else {
    span.removeAttribute('aria-hidden');
    span.setAttribute('aria-label', text);
  }

  inlineSvg(span, svgMarkup);
  return span;
}

/**
 * Upgrades an existing span.icon.icon-{name} placeholder to inline SVG.
 * @param {HTMLElement} span
 * @returns {Promise<HTMLElement | null>}
 */
export async function decorateIcon(span) {
  if (!span || !(span instanceof HTMLElement)) return null;
  if (span.querySelector('svg')) return span;

  const name = iconNameFromSpan(span);
  if (!name) return null;

  const svgMarkup = await loadSvg(name);
  if (!svgMarkup) return null;

  if (!span.hasAttribute('aria-label') && !span.hasAttribute('aria-hidden')) {
    span.setAttribute('aria-hidden', 'true');
  }

  inlineSvg(span, svgMarkup);
  return span;
}

/**
 * Batch-decorates all span.icon placeholders under a root element.
 * @param {Element} root
 * @returns {Promise<void>}
 */
export async function decorateIcons(root) {
  if (!root) return;
  const icons = root.querySelectorAll(`span.${ICON_CLASS}`);
  await Promise.all([...icons].map((span) => decorateIcon(span)));
}

/**
 * Shared tag (pill/chip) primitive. Blocks pass a label and get back a ready to
 * use element, so tags look the same everywhere. Appearance lives in
 * styles.css, placement stays with the calling block.
 */

export const TAG_CLASS = 'tag';

/** class names and element names are limited to kebab-case tokens */
const TOKEN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * @param {string | string[] | undefined} classes
 * @returns {string[]}
 */
function toClassNames(classes) {
  const list = Array.isArray(classes) ? classes : `${classes ?? ''}`.split(/\s+/);
  return list.map((name) => `${name}`.trim()).filter((name) => TOKEN.test(name));
}

/**
 * Creates a tag element. Returns null for an empty label so callers can append
 * the result without rendering an empty pill.
 * @param {string} label the tag text
 * @param {object} [options]
 * @param {string} [options.tagName] element to create, defaults to `span`
 * @param {string} [options.variant] adds a `tag-{variant}` modifier class
 * @param {string | string[]} [options.classes] extra classes, for placement
 * @returns {HTMLElement | null}
 */
export function createTag(label, { tagName = 'span', variant, classes = [] } = {}) {
  const text = `${label ?? ''}`.trim();
  if (!text) return null;

  const tag = document.createElement(TOKEN.test(tagName) ? tagName : 'span');
  tag.classList.add(TAG_CLASS);
  if (variant && TOKEN.test(variant)) tag.classList.add(`${TAG_CLASS}-${variant}`);
  tag.classList.add(...toClassNames(classes));
  tag.textContent = text;
  return tag;
}

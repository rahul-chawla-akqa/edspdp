/**
 * Shared button primitive. Blocks pass label, href or action semantics, and optional
 * icon metadata; appearance lives in styles.css, placement stays with the caller.
 */

import { createIcon } from './icon.js';

export const BUTTON_CLASS = 'button';

const VARIANTS = new Set(['primary', 'secondary', 'accent', 'text']);
const SIZES = new Set(['sm', 'md', 'xs']);
/** class names and icon tokens are limited to kebab-case */
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
 * @param {object} options
 * @param {HTMLElement} [element]
 * @returns {object | null}
 */
function normalizeOptions(options, element) {
  const href = options.href !== undefined ? `${options.href}`.trim() : undefined;
  const explicitLabel = options.label !== undefined ? `${options.label}`.trim() : undefined;
  const label = explicitLabel ?? element?.textContent?.trim() ?? '';
  const variant = options.variant && VARIANTS.has(options.variant) ? options.variant : undefined;
  const size = SIZES.has(options.size) ? options.size : undefined;
  let icon = options.icon && TOKEN.test(options.icon) ? options.icon : undefined;
  let iconPosition = options.iconPosition === 'end' ? 'end' : 'start';
  const iconOnly = options.iconOnly === true || (!!icon && !label);
  const ariaLabel = `${options.ariaLabel ?? ''}`.trim();
  const title = `${options.title ?? label ?? ariaLabel ?? ''}`.trim();
  const classes = toClassNames(options.classes);
  const disabled = options.disabled === true;

  if (variant === 'text' && !iconOnly) {
    icon = icon || 'external-link';
    iconPosition = 'end';
  }

  if (iconOnly) {
    if (!icon || !ariaLabel) return null;
  } else if (!label) {
    return null;
  }

  if (variant === 'text' && href === undefined && element?.tagName !== 'A') {
    return null;
  }

  return {
    href,
    label,
    icon,
    iconOnly,
    ariaLabel,
    variant,
    size,
    title,
    classes,
    iconPosition,
    disabled,
    replaceContent: explicitLabel !== undefined || !!icon,
  };
}

/**
 * @param {object} config
 * @returns {string}
 */
function buildClassName(config) {
  const names = [BUTTON_CLASS];
  if (config.variant) names.push(config.variant);
  if (config.size) names.push(`size-${config.size}`);
  if (config.iconOnly) names.push('icon-only');
  names.push(...config.classes);
  return names.join(' ');
}

/**
 * @param {HTMLElement} element
 * @param {object} config
 */
function applyAttributes(element, config) {
  if (config.title) element.title = config.title;

  if (config.iconOnly || (config.icon && !config.label)) {
    element.setAttribute('aria-label', config.ariaLabel);
  } else {
    element.removeAttribute('aria-label');
  }

  if (element.tagName === 'BUTTON') {
    element.disabled = config.disabled;
    element.removeAttribute('aria-disabled');
  } else if (config.disabled) {
    element.setAttribute('aria-disabled', 'true');
  } else {
    element.removeAttribute('aria-disabled');
  }
}

/**
 * @param {HTMLElement} element
 * @param {object} config
 */
async function applyContent(element, config) {
  if (!config.replaceContent) return;

  if (config.icon) {
    const iconEl = await createIcon(config.icon);
    if (!iconEl) return;

    element.replaceChildren();
    if (config.iconOnly) {
      element.append(iconEl);
      return;
    }

    const text = document.createTextNode(config.label);
    if (config.iconPosition === 'end') {
      element.append(text, iconEl);
    } else {
      element.append(iconEl, text);
    }
    return;
  }

  element.textContent = config.label;
}

/**
 * Applies the shared button contract to an existing anchor or button.
 * @param {HTMLElement} element
 * @param {object} [options]
 * @returns {Promise<HTMLElement | null>}
 */
export async function decorateButton(element, options = {}) {
  if (!element || !(element instanceof HTMLElement)) return null;
  if (element.tagName !== 'A' && element.tagName !== 'BUTTON') return null;

  const config = normalizeOptions(options, element);
  if (!config) return null;

  element.className = buildClassName(config);
  applyAttributes(element, config);
  await applyContent(element, config);
  return element;
}

/**
 * Creates a link or action button element. Returns null for invalid or inaccessible input.
 * @param {object} [options]
 * @returns {Promise<HTMLAnchorElement | HTMLButtonElement | null>}
 */
export async function createButton(options = {}) {
  const config = normalizeOptions(options);
  if (!config) return null;

  const useLink = config.href !== undefined && config.href !== '';
  const element = document.createElement(useLink ? 'a' : 'button');
  if (useLink) {
    element.href = config.href;
  } else {
    element.type = 'button';
  }

  return decorateButton(element, { ...options, label: config.label });
}

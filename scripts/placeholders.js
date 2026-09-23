import { toCamelCase } from './aem.js';

/**
 * Country and language from a `/{country}/{lang}/` path, as a placeholders column.
 * `/us/en/contact` becomes `us_en`. Any other path uses the `default` column.
 * @param {string} [pathname]
 * @returns {string}
 */
export function localeFromPath(pathname) {
  const path = pathname ?? (typeof window === 'undefined' ? '' : window.location.pathname);
  const match = path.match(/^\/([a-z]{2})\/([a-z]{2})(?:\/|$)/i);
  return match ? `${match[1]}_${match[2]}`.toLowerCase() : 'default';
}

function ensureStore() {
  window.placeholders = window.placeholders || {};
  return window.placeholders;
}

function readCell(row, column) {
  const key = Object.keys(row).find((name) => name.toLowerCase() === column);
  const value = key ? row[key] : '';
  return value == null ? '' : String(value).trim();
}

function placeholderValue(row, column) {
  const localized = column === 'default' ? '' : readCell(row, column);
  return localized || readCell(row, 'default');
}

function indexRows(json) {
  const rows = {};
  (json?.data || []).forEach((row) => {
    if (!row?.i18n) return;
    rows[toCamelCase(row.i18n)] = row;
  });
  return rows;
}

function resolveRows(rows, column) {
  return Object.fromEntries(
    Object.entries(rows).map(([key, row]) => [key, placeholderValue(row, column)]),
  );
}

/**
 * Loads `/placeholders.json` once per page. Later callers share the same promise.
 * @returns {Promise<object>}
 */
function loadSheet() {
  const store = ensureStore();
  if (!store.sheet) {
    const base = window.hlx?.codeBasePath || '';
    store.sheet = fetch(`${base}/placeholders.json`)
      .then((resp) => (resp.ok ? resp.json() : {}))
      .then((json) => {
        const rows = indexRows(json);
        store.sheet = rows;
        return rows;
      })
      .catch(() => {
        store.sheet = {};
        return {};
      });
  }
  return Promise.resolve(store.sheet);
}

/**
 * Placeholder strings for one locale column. The sheet is fetched once;
 * another locale on the same page is resolved from that cache.
 * @param {string} [locale] Column such as `us_en`. Defaults to the URL locale.
 * @returns {Promise<object>}
 */
export async function fetchPlaceholders(locale) {
  const pageLocale = localeFromPath();
  const column = (locale || pageLocale).toLowerCase();
  const store = ensureStore();
  store.locales = store.locales || {};
  if (!store.locales[column]) {
    store.locales[column] = loadSheet().then((rows) => {
      const resolved = resolveRows(rows, column);
      store.locales[column] = resolved;
      if (column === pageLocale) store.resolved = resolved;
      return resolved;
    });
  }
  const value = await store.locales[column];
  if (column === pageLocale) store.resolved = value;
  return value;
}

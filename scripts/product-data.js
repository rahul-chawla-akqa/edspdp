/*
 * Client-side counterpart to the server-side composer.
 *
 * On a published page the overlay has already filled these blocks and marked them
 * `api-rendered`, so nothing here runs. It exists for two cases: authoring inside
 * Universal Editor, which renders straight from AEM and never sees the overlay, and
 * graceful degradation when the overlay fell back to the unmodified AEM page.
 */

const API_BASE = 'https://dummyjson.com/products';

const requests = new Map();

/**
 * Resolves the product key the same way the composer does, so both paths agree:
 * authored override first, then page metadata, then the URL.
 * @param {Element} block
 * @returns {string|null}
 */
export function resolveProductId(block) {
  const authored = block ? block.textContent.trim() : '';
  if (/^[\w-]+$/.test(authored)) return authored;

  const meta = document.head.querySelector('meta[name="product-id"]');
  if (meta && meta.content.trim()) return meta.content.trim();

  const match = window.location.pathname.match(/^\/products\/([\w-]+)\/?$/);
  return match ? match[1] : null;
}

/** Deduplicated per page load so three product blocks cost one request. */
export async function fetchProduct(id) {
  if (!id) return null;
  if (!requests.has(id)) {
    const request = fetch(`${API_BASE}/${encodeURIComponent(id)}`)
      .then((resp) => (resp.ok ? resp.json() : null))
      .catch(() => null);
    requests.set(id, request);
  }
  return requests.get(id);
}

/**
 * Fills an unrendered block using the shared renderer.
 * @returns {Promise<boolean>} whether the block has content worth decorating
 */
export async function hydrate(block, render) {
  if (block.classList.contains('api-rendered')) return true;

  const data = await fetchProduct(resolveProductId(block));
  if (!data) {
    // Leave nothing behind rather than showing a raw product id to visitors.
    block.replaceChildren();
    return false;
  }

  const markup = render(data);
  if (!markup) {
    block.replaceChildren();
    return false;
  }

  block.innerHTML = markup;
  return true;
}

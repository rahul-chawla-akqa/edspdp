/*
 * Client-side counterpart to the Fastly posts composer.
 *
 * On the custom domain the edge function fills the block and marks it `api-rendered`.
 * This module runs in Universal Editor, on *.aem.live / *.aem.page, and when the
 * function returned the authored page because the API was unavailable.
 */

const API_BASE = 'https://jsonplaceholder.typicode.com/posts';

const requests = new Map();

/**
 * Authored override first, then page metadata, then /posts/post-N from the URL.
 * @param {Element} block
 * @returns {string|null}
 */
export function resolvePostId(block) {
  const authored = block ? block.textContent.trim() : '';
  if (/^\d+$/.test(authored)) return authored;

  const meta = document.head.querySelector('meta[name="post-id"]');
  if (meta && /^\d+$/.test(meta.content.trim())) return meta.content.trim();

  const match = window.location.pathname.match(/^(?:\/drafts)?\/posts\/post-(\d+)\/?$/);
  return match ? match[1] : null;
}

/** Deduplicated per page load. */
export async function fetchPost(id) {
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

  const data = await fetchPost(resolvePostId(block));
  if (!data) {
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

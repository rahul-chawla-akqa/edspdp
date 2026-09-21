import { product, post } from './fixtures/product.js';
import { footerPlainHtml, fragmentPlainHtml, navPlainHtml } from './fixtures/fragments.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html' },
  });
}

function pathnameOf(url) {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

/**
 * Intercepts product, post, fragment, and form requests so stories stay offline.
 * All other fetches (Storybook HMR, icons, CSS) pass through.
 */
export function installFetchStub() {
  if (window.edsStorybookFetchStubbed) return;
  window.edsStorybookFetchStubbed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || (typeof input !== 'string' && input.method) || 'GET')
      .toUpperCase();
    const path = pathnameOf(url);

    if (/dummyjson\.com\/products\//.test(url) || /\/product-data\/[\w-]+\.json$/.test(path)) {
      return jsonResponse(product);
    }

    if (/jsonplaceholder\.typicode\.com\/posts\//.test(url)) {
      return jsonResponse(post);
    }

    if (path.endsWith('.plain.html')) {
      const fragmentPath = path.replace(/\.plain\.html$/, '');
      if (fragmentPath === '/nav' || fragmentPath.endsWith('/nav')) {
        return htmlResponse(navPlainHtml);
      }
      if (fragmentPath === '/footer' || fragmentPath.endsWith('/footer')) {
        return htmlResponse(footerPlainHtml);
      }
      return htmlResponse(fragmentPlainHtml);
    }

    if (method === 'POST' && (path === '/storybook/form-submit' || path.startsWith('/form'))) {
      return jsonResponse({ ok: true });
    }

    return originalFetch(input, init);
  };
}

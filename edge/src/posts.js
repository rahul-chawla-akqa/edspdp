/// <reference types="@fastly/js-compute" />

import { CacheOverride } from 'fastly:cache-override';
import { ConfigStore } from 'fastly:config-store';
import {
  apiUrl,
  blockOverrideId,
  cacheHeaders,
  fillPostBlock,
  parsePostId,
  renderRows,
} from './stitch.js';

const SENTINEL = 'x-edgefunction-request';

function edsOrigin(requestUrl) {
  try {
    const origin = new ConfigStore('config_default').get('EDS_ORIGIN');
    if (origin) return origin.replace(/\/$/, '');
  } catch {
    // Config store is optional; production loops back on the visitor hostname.
  }
  return new URL(requestUrl).origin;
}

function isLocalCompute(requestUrl) {
  const host = new URL(requestUrl).hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

/** Viceroy requires named backends from fastly.toml. Adobe CDN does not. */
function backendFor(resourceUrl, requestUrl) {
  if (!isLocalCompute(requestUrl)) return undefined;
  const host = new URL(resourceUrl).hostname;
  if (host === 'jsonplaceholder.typicode.com') return 'jsonplaceholder';
  if (host === '127.0.0.1' || host === 'localhost') return 'local_eds';
  return 'eds';
}

function copyRequestHeaders(request) {
  const headers = new Headers();
  ['accept', 'accept-language', 'cookie', 'user-agent'].forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });
  headers.set(SENTINEL, 'true');
  return headers;
}

function fetchUpstream(resource, requestUrl, init = {}) {
  const backend = backendFor(resource, requestUrl);
  const opts = {
    ...init,
    cacheOverride: init.cacheOverride || new CacheOverride({ ttl: 300 }),
  };
  if (backend) opts.backend = backend;
  return fetch(resource, opts);
}

async function fetchEds(request) {
  const url = new URL(request.url);
  const target = `${edsOrigin(request.url)}${url.pathname}${url.search}`;
  return fetchUpstream(target, request.url, {
    method: 'GET',
    headers: copyRequestHeaders(request),
  });
}

async function fetchPostJson(id, requestUrl) {
  const response = await fetchUpstream(apiUrl(id), requestUrl, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Proxy CSS/JS/images to AEM so the local Fastly port can render a full page. */
export async function passThroughEds(request) {
  try {
    return await fetchEds(request);
  } catch (error) {
    console.log(`posts: pass-through failed: ${error.message || error}`);
    return new Response('Bad gateway', { status: 502 });
  }
}

/**
 * Stitches EDS HTML with JSONPlaceholder for /posts/post-N.
 * On API failure returns the authored page so client hydration can fill the block.
 */
export default async function postsHandler(request) {
  const url = new URL(request.url);
  const pathId = parsePostId(url.pathname);

  let edsResponse;
  try {
    edsResponse = await fetchEds(request);
  } catch (error) {
    console.log(`posts: EDS fetch failed: ${error.message || error}`);
    return new Response('Bad gateway', { status: 502 });
  }

  if (!edsResponse || !edsResponse.ok) {
    return edsResponse || new Response('Not Found', { status: 404 });
  }

  const html = await edsResponse.text();
  if (!pathId) {
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const id = blockOverrideId(html) || pathId;

  let data;
  try {
    data = await fetchPostJson(id, request.url);
  } catch (error) {
    console.log(`posts: API fetch failed: ${error.message || error}`);
    data = null;
  }

  const rows = renderRows(data);
  const stitched = rows ? fillPostBlock(html, rows) : null;
  if (!stitched) {
    return new Response(html, { status: 200, headers: cacheHeaders(id) });
  }

  return new Response(stitched, { status: 200, headers: cacheHeaders(id) });
}

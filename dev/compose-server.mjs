/*
 * Local harness for the overlay composer.
 *
 * `aem up` on its own serves pages that were already ingested into the preview content bus,
 * so it cannot exercise composition. This server sits in front of it as the content origin:
 *
 *   node dev/compose-server.mjs                     # this proxy on :4000
 *   aem up --no-open --url http://localhost:4000     # aem cli serves local blocks/css/js
 *
 * It runs the exact same compose() the deployed action runs, so composition bugs surface
 * here instead of after a deploy. Anything it does not compose is proxied through
 * unchanged, mirroring the Admin API's fallback to the primary content source.
 */
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import compose from '../ssr/src/compose.js';
import { normalizePath } from '../ssr/src/routes.js';
import { createDataFetcher, createPrimaryFetcher } from '../ssr/src/http.js';

const PORT = Number(process.env.PORT) || 4000;
const AUTHOR_URL = process.env.PRIMARY_SOURCE_URL
  || 'https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/rahul-chawla-akqa/edspdp/main';
const PREVIEW_URL = process.env.DEV_PREVIEW_URL
  || 'https://main--edspdp--rahul-chawla-akqa.aem.page';

/** Reads AEM_TOKEN from .env.local without adding a dotenv dependency. */
function readToken() {
  if (process.env.AEM_TOKEN) return process.env.AEM_TOKEN;
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
    const match = env.match(/^\s*AEM_TOKEN\s*=\s*"?([^"\n]+)"?/m);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

const token = readToken();

/*
 * With a token we read the same AEM Author source the deployed action reads. Without one we
 * fall back to the public preview origin, which serves already-ingested markup -- close
 * enough to iterate on renderers and block CSS, and it needs no credentials.
 */
const usingAuthor = Boolean(token);
const baseUrl = usingAuthor ? AUTHOR_URL : PREVIEW_URL;
const suffix = usingAuthor ? '.html' : '';

const logger = {
  error: (...args) => console.error('  ', ...args),
  warn: (...args) => console.warn('  ', ...args),
  info: () => {},
  debug: () => {},
};

const fetchRemotePrimary = createPrimaryFetcher({
  baseUrl,
  suffix,
  authorization: token ? `Bearer ${token}` : '',
  timeoutMs: 10000,
  logger,
});
const fetchData = createDataFetcher({ timeoutMs: 10000, logger });

/*
 * drafts/ stands in for authored content, so composition can be developed before any page
 * exists in AEM. A draft always wins, which also lets you reproduce a reported page locally.
 */
function draftFor(contentPath) {
  const candidates = [
    `.${contentPath}.html`,
    `.${contentPath}/index.html`,
  ].map((relative) => new URL(`../drafts/${relative.slice(2)}`, import.meta.url));
  return candidates.find((candidate) => existsSync(candidate));
}

async function fetchPrimary(contentPath) {
  const draft = draftFor(normalizePath(contentPath));
  if (draft) {
    console.log(`  primary from drafts${contentPath}.html`);
    return { status: 200, html: readFileSync(draft, 'utf-8') };
  }
  return fetchRemotePrimary(contentPath);
}

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

/*
 * Files that live in the repo, such as head.html, are code rather than content. The AEM CLI
 * asks the content origin for some of them, so serve them from disk before composing --
 * otherwise head.html would be normalized to /head and 404 upstream.
 */
function repoFile(pathname) {
  const resolved = fileURLToPath(new URL(`.${pathname}`, new URL('..', import.meta.url)));
  if (!resolved.startsWith(REPO_ROOT)) return null;
  if (!existsSync(resolved) || !statSync(resolved).isFile()) return null;
  return resolved;
}

/*
 * A page is either an extensionless path or one carrying the .html suffix, because both the
 * AEM CLI and the Admin API append the configured suffix when requesting content.
 */
function isPagePath(pathname) {
  const last = pathname.split('/').pop();
  return !last.includes('.') || /\.(plain\.)?html$/i.test(last);
}

async function passThrough(pathname, search, res) {
  const isPage = isPagePath(pathname);
  const draft = isPage ? draftFor(normalizePath(pathname)) : null;
  if (draft) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(readFileSync(draft, 'utf-8'));
    return 200;
  }

  // Re-derive the suffix from the clean path so it is never appended twice.
  const upstream = isPage
    ? `${baseUrl}${normalizePath(pathname)}${suffix}${search}`
    : `${baseUrl}${pathname}${search}`;
  try {
    const resp = await fetch(upstream, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.writeHead(resp.status, {
      'content-type': resp.headers.get('content-type') || 'application/octet-stream',
    });
    res.end(buffer);
    return resp.status;
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`proxy error: ${error.message}`);
    return 502;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname, search } = url;

  const local = repoFile(pathname);
  if (local) {
    const extension = pathname.split('.').pop().toLowerCase();
    res.writeHead(200, { 'content-type': CONTENT_TYPES[extension] || 'application/octet-stream' });
    res.end(readFileSync(local));
    console.log(`local     ${pathname}`);
    return;
  }

  if (isPagePath(pathname)) {
    const result = await compose({
      path: pathname, fetchPrimary, fetchData, logger,
    });
    if (result.status === 200) {
      console.log(`composed  ${pathname}`);
      res.writeHead(200, result.headers);
      res.end(result.body);
      return;
    }
    console.log(`fallback  ${pathname}  (${result.outcome})`);
  }

  const status = await passThrough(pathname, search, res);
  if (!isPagePath(pathname)) console.log(`proxied   ${pathname} -> ${status}`);
});

server.listen(PORT, () => {
  console.log(`compose proxy listening on http://localhost:${PORT}`);
  console.log(`primary source: ${baseUrl}${suffix || ''}`);
  console.log(usingAuthor
    ? 'using AEM Author (AEM_TOKEN found)'
    : 'using public preview origin -- set AEM_TOKEN in .env.local to read AEM Author directly');
  console.log(`next: aem up --no-open --url http://localhost:${PORT}`);
});

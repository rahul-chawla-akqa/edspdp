#!/usr/bin/env node
/*
 * Wires the deployed composer into the site as a BYOM content overlay, and drives
 * preview/publish.
 *
 * Overlay configuration is only possible through the configuration service -- fstab.yaml
 * cannot express an overlay -- so the first run has to migrate the mountpoint into a site
 * config.
 *
 * Auth: the configuration service expects a Sidekick token in the x-auth-token header, not
 * an `aio` CLI or AEM Dev Console token. Obtain one by logging in at
 *   https://admin.hlx.page/login/{org}/{site}/{branch}
 * then export it as AEM_ADMIN_TOKEN.
 *
 * Usage:
 *   node ssr/scripts/wire-overlay.mjs status
 *   node ssr/scripts/wire-overlay.mjs init
 *   node ssr/scripts/wire-overlay.mjs set-overlay <composer-url>
 *   node ssr/scripts/wire-overlay.mjs remove-overlay
 *   node ssr/scripts/wire-overlay.mjs preview /products/1 [...]
 *   node ssr/scripts/wire-overlay.mjs publish /products/1 [...]
 */
import { readFileSync } from 'node:fs';

const ADMIN = 'https://admin.hlx.page';

function loadEnvFile(url) {
  try {
    readFileSync(url, 'utf-8').split('\n').forEach((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    });
  } catch {
    // Optional: values may come from the real environment instead.
  }
}

loadEnvFile(new URL('../.env', import.meta.url));
loadEnvFile(new URL('../../.env.local', import.meta.url));

const ORG = process.env.AEM_ORG || 'rahul-chawla-akqa';
const SITE = process.env.AEM_SITE || 'edspdp';
const BRANCH = process.env.AEM_BRANCH || 'main';
const TOKEN = process.env.AEM_ADMIN_TOKEN || '';

const PRIMARY = {
  url: process.env.PRIMARY_SOURCE_URL
    || `https://author-p104103-e1884364.adobeaemcloud.com/bin/franklin.delivery/${ORG}/${SITE}/${BRANCH}`,
  type: 'markup',
  suffix: process.env.PRIMARY_SOURCE_SUFFIX || '.html',
};

function requireToken() {
  if (TOKEN) return;
  console.error('AEM_ADMIN_TOKEN is not set.');
  console.error(`Get one by logging in at ${ADMIN}/login/${ORG}/${SITE}/${BRANCH}`);
  process.exit(2);
}

async function call(method, url, body) {
  const resp = await fetch(url, {
    method,
    headers: {
      'x-auth-token': TOKEN,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await resp.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Plain-text responses are fine to surface as-is.
  }
  console.log(`${method} ${url} -> ${resp.status}`);
  if (parsed) console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
  if (!resp.ok) process.exitCode = 1;
  return { status: resp.status, body: parsed };
}

async function readContentConfig() {
  const resp = await fetch(`${ADMIN}/config/${ORG}/sites/${SITE}.json`, {
    headers: { 'x-auth-token': TOKEN },
  });
  if (!resp.ok) return null;
  const config = await resp.json();
  return config.content || null;
}

const commands = {
  async status() {
    requireToken();
    await call('GET', `${ADMIN}/config/${ORG}/sites/${SITE}.json`);
  },

  /*
   * Creates the site config, replacing what fstab.yaml used to declare. Returns 409 if a
   * config already exists, in which case set-overlay is the command you want.
   */
  async init() {
    requireToken();
    await call('PUT', `${ADMIN}/config/${ORG}/sites/${SITE}.json`, {
      version: 1,
      code: { owner: ORG, repo: SITE },
      content: { source: PRIMARY },
    });
  },

  'set-overlay': async (composerUrl) => {
    requireToken();
    if (!composerUrl) {
      console.error('usage: set-overlay <composer-url>');
      console.error('e.g. https://<namespace>.adobeioruntime.net/api/v1/web/edspdp-ssr/compose');
      process.exit(2);
    }
    /*
     * No suffix on the overlay: the composer normalizes paths itself and adds the primary
     * source's suffix when it fetches the authored page.
     */
    await call('POST', `${ADMIN}/config/${ORG}/sites/${SITE}/content.json`, {
      source: PRIMARY,
      overlay: { url: composerUrl, type: 'markup' },
    });
  },

  'remove-overlay': async () => {
    requireToken();
    // Posting the content config without an overlay field is how the overlay is dropped.
    await call('POST', `${ADMIN}/config/${ORG}/sites/${SITE}/content.json`, { source: PRIMARY });
  },

  async preview(...paths) {
    requireToken();
    if (!paths.length) {
      console.error('usage: preview /products/1 [...]');
      process.exit(2);
    }
    await call('POST', `${ADMIN}/preview/${ORG}/${SITE}/${BRANCH}/*`, { paths, forceUpdate: true });
  },

  async publish(...paths) {
    requireToken();
    if (!paths.length) {
      console.error('usage: publish /products/1 [...]');
      process.exit(2);
    }
    await call('POST', `${ADMIN}/live/${ORG}/${SITE}/${BRANCH}/*`, { paths, forceUpdate: true });
  },

  async check() {
    requireToken();
    const content = await readContentConfig();
    if (!content) {
      console.error('could not read the site config; check AEM_ADMIN_TOKEN');
      process.exit(1);
    }
    console.log(`primary: ${content.source ? content.source.url : '(none)'}`);
    console.log(`overlay: ${content.overlay ? content.overlay.url : '(none)'}`);
    if (!content.overlay) {
      console.log('\nNo overlay registered yet. Run set-overlay <composer-url>.');
    }
  },
};

const [command, ...args] = process.argv.slice(2);
const handler = commands[command];
if (!handler) {
  console.error(`unknown command: ${command || '(none)'}`);
  console.error(`available: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}
await handler(...args);

#!/usr/bin/env node
/*
 * Preview and publish DummyJSON products onto the EDS content bus as
 * /product-data/{id}.json.
 *
 * Admin does not accept a JSON body. It fetches the BYOM overlay for each path, so the
 * compose action must already be deployed and registered, and must return sheet JSON for
 * /product-data/{id}. Paths sent to Admin include the `.json` suffix so they are ingested as
 * spreadsheets, not empty HTML pages.
 *
 * Usage:
 *   npm run eds:publish-product-json -- --ids 1 2 3
 *   npm run eds:publish-product-json -- --ids 1,2,3
 *   npm run eds:publish-product-json -- --catalog --limit 30
 *   npm run eds:publish-product-json -- --dry-run --catalog
 *   npm run eds:publish-product-json -- --ids 1 --pages
 *   npm run eds:publish-product-json -- --catalog --limit 30 --pages
 */
import { readFileSync } from 'node:fs';
import { refreshPaths } from '../src/admin.js';

const CATALOG = 'https://dummyjson.com/products';
const DEFAULT_LIMIT = 30;
const DEFAULT_BATCH = 50;

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

function parseArgs(argv) {
  const ids = [];
  let catalog = false;
  let dryRun = false;
  let previewOnly = false;
  let pages = false;
  let limit = DEFAULT_LIMIT;
  let batch = DEFAULT_BATCH;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--catalog') {
      catalog = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--preview-only') {
      previewOnly = true;
    } else if (arg === '--pages') {
      pages = true;
    } else if (arg === '--limit') {
      i += 1;
      limit = Number(argv[i]) || DEFAULT_LIMIT;
    } else if (arg === '--batch') {
      i += 1;
      batch = Number(argv[i]) || DEFAULT_BATCH;
    } else if (arg === '--ids') {
      i += 1;
      while (i < argv.length && !String(argv[i]).startsWith('--')) {
        String(argv[i]).split(',').map((part) => part.trim()).filter(Boolean)
          .forEach((id) => ids.push(id));
        i += 1;
      }
      i -= 1;
    } else if (!arg.startsWith('--')) {
      String(arg).split(',').map((part) => part.trim()).filter(Boolean)
        .forEach((id) => ids.push(id));
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  return {
    ids, catalog, dryRun, previewOnly, pages, limit, batch,
  };
}

async function catalogIds(limit) {
  const collected = [];
  let skip = 0;
  /* eslint-disable no-await-in-loop -- catalog pages must be fetched in order */
  while (collected.length < limit) {
    const pageSize = Math.min(30, limit - collected.length);
    const resp = await fetch(`${CATALOG}?limit=${pageSize}&skip=${skip}`);
    if (!resp.ok) {
      throw new Error(`dummyjson catalog returned ${resp.status}`);
    }
    const body = await resp.json();
    const products = body.products || [];
    products.forEach((product) => collected.push(String(product.id)));
    skip += products.length;
    if (!products.length || skip >= (body.total || 0)) break;
  }
  /* eslint-enable no-await-in-loop */
  return collected;
}

function chunk(items, size) {
  return items.reduce((acc, item, index) => {
    if (index % size === 0) acc.push([]);
    acc[acc.length - 1].push(item);
    return acc;
  }, []);
}

function dataPaths(ids) {
  // The .json suffix is what makes Admin ingest a spreadsheet instead of running html2md.
  return [...new Set(ids)].map((id) => `/product-data/${id}.json`);
}

function pagePaths(ids) {
  return [...new Set(ids)].map((id) => `/product-detail/${id}`);
}

function describe(stage, result) {
  if (!result) return `  ${stage}: skipped`;
  const job = result.job ? `, job ${result.job.state}, ${result.job.failed} failed` : '';
  return `  ${stage}: HTTP ${result.status}${job}`;
}

async function publishBatches(paths, { label, batch, previewOnly }) {
  if (!paths.length) return 0;
  console.log(`${paths.length} ${label}:`);
  paths.forEach((path) => console.log(`  ${path}`));
  const batches = chunk(paths, batch);
  let failures = 0;
  await batches.reduce((previous, group, index) => previous.then(async () => {
    console.log(`\n${label} batch ${index + 1}/${batches.length} (${group.length} paths)`);
    const result = await refreshPaths({
      org: ORG,
      site: SITE,
      branch: BRANCH,
      token: TOKEN,
      paths: group,
      publish: !previewOnly,
    });
    console.log(describe('preview', result.preview));
    console.log(describe('publish', result.live));
    if (!result.ok) failures += 1;
  }), Promise.resolve());
  return failures;
}

const options = parseArgs(process.argv.slice(2));

if (!options.ids.length && !options.catalog) {
  console.error('provide --ids or --catalog');
  console.error('example: npm run eds:publish-product-json -- --ids 1 2 3');
  process.exit(2);
}

let { ids } = options;
if (options.catalog) {
  ids = ids.concat(await catalogIds(options.limit));
}

const jsonPaths = dataPaths(ids);
const htmlPaths = options.pages ? pagePaths(ids) : [];
if (!jsonPaths.length) {
  console.error('no product ids to publish');
  process.exit(1);
}

console.log(`${jsonPaths.length} product JSON path(s):`);
jsonPaths.forEach((path) => console.log(`  ${path}`));
if (htmlPaths.length) {
  console.log(`${htmlPaths.length} PDP HTML path(s):`);
  htmlPaths.forEach((path) => console.log(`  ${path}`));
}

if (options.dryRun) {
  console.log('\n--dry-run: stopping before preview/publish');
  process.exit(0);
}

if (!TOKEN) {
  console.error('AEM_ADMIN_TOKEN is required (omit it with --dry-run)');
  console.error(`Get one at https://admin.hlx.page/login/${ORG}/${SITE}/${BRANCH}`);
  process.exit(2);
}

let failures = await publishBatches(jsonPaths, {
  label: 'json',
  batch: options.batch,
  previewOnly: options.previewOnly,
});
if (!failures && htmlPaths.length) {
  failures += await publishBatches(htmlPaths, {
    label: 'html',
    batch: options.batch,
    previewOnly: options.previewOnly,
  });
}

if (failures) {
  console.error(`\n${failures} batch(es) failed`);
  process.exit(1);
}
console.log(options.previewOnly ? '\npreview complete' : '\npreview and publish complete');

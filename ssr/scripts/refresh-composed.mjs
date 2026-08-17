#!/usr/bin/env node
/*
 * Periodic safety net for composed pages.
 *
 * A composed page holds a snapshot of the external data taken when it was published, so it
 * drifts as the source data changes. The refresh webhook handles known changes; this script
 * handles everything the webhook missed by re-previewing and re-publishing every page the
 * composer owns.
 *
 * Which pages those are is derived from the same route table the composer uses, so adding a
 * page type to routes.js automatically brings it into the refresh cycle.
 *
 * Usage:
 *   node ssr/scripts/refresh-composed.mjs --dry-run
 *   node ssr/scripts/refresh-composed.mjs --batch 50
 */
import { matchRoute, normalizePath } from '../src/routes.js';
import { refreshPaths } from '../src/admin.js';

const ORG = process.env.AEM_ORG || 'rahul-chawla-akqa';
const SITE = process.env.AEM_SITE || 'edspdp';
const BRANCH = process.env.AEM_BRANCH || 'main';
const TOKEN = process.env.AEM_ADMIN_TOKEN || '';
const INDEX_URL = process.env.QUERY_INDEX_URL
  || `https://${BRANCH}--${SITE}--${ORG}.aem.live/query-index.json`;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchIndex = args.indexOf('--batch');
const batchSize = batchIndex >= 0 ? Number(args[batchIndex + 1]) || 50 : 50;

function chunk(items, size) {
  return items.reduce((acc, item, index) => {
    if (index % size === 0) acc.push([]);
    acc[acc.length - 1].push(item);
    return acc;
  }, []);
}

async function composedPaths() {
  let resp;
  try {
    resp = await fetch(INDEX_URL);
  } catch (error) {
    // Scheduled runs read this in CI logs, so report the cause rather than a stack trace.
    console.error(`could not reach the query index at ${INDEX_URL}: ${error.message}`);
    process.exit(1);
  }
  if (!resp.ok) {
    console.error(`query index returned ${resp.status} for ${INDEX_URL}`);
    process.exit(1);
  }
  const index = await resp.json();
  return (index.data || [])
    .map((entry) => normalizePath(entry.path))
    .filter((path) => matchRoute(path));
}

const paths = await composedPaths();

if (!paths.length) {
  console.log('no composed pages found in the query index; nothing to refresh');
  process.exit(0);
}

console.log(`${paths.length} composed page(s) to refresh:`);
paths.forEach((path) => console.log(`  ${path}`));

if (dryRun) {
  console.log('\n--dry-run: stopping before preview/publish');
  process.exit(0);
}

if (!TOKEN) {
  console.error('AEM_ADMIN_TOKEN is required to refresh (omit it with --dry-run)');
  process.exit(2);
}

const batches = chunk(paths, batchSize);
let failures = 0;

// Sequential on purpose: parallel bulk jobs against the same site only add contention.
function describe(stage, result) {
  if (!result) return `  ${stage}: skipped`;
  const job = result.job ? `, job ${result.job.state}, ${result.job.failed} failed` : '';
  return `  ${stage}: HTTP ${result.status}${job}`;
}

await batches.reduce((previous, batch, index) => previous.then(async () => {
  console.log(`\nbatch ${index + 1}/${batches.length} (${batch.length} paths)`);
  const result = await refreshPaths({
    org: ORG, site: SITE, branch: BRANCH, token: TOKEN, paths: batch,
  });
  console.log(describe('preview', result.preview));
  console.log(describe('publish', result.live));
  if (!result.ok) failures += 1;
}), Promise.resolve());

if (failures) {
  console.error(`\n${failures} batch(es) failed`);
  process.exit(1);
}
console.log('\nrefresh complete');

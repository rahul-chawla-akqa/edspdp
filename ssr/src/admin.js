/*
 * Thin client for the AEM Admin API bulk preview/publish endpoints.
 *
 * Composed pages carry a snapshot of the external data taken at publish time, so the only
 * way to refresh them is to re-run preview and publish. The bulk job endpoints accept many
 * paths in one call, which is what keeps a catalog-wide refresh practical.
 *
 * Important: the bulk endpoints are asynchronous. They answer 202 as soon as the job is
 * queued -- even for a request that later fails auth -- so a 202 says nothing about whether
 * the pages were actually updated. Everything here therefore waits for the job to finish
 * before treating it as successful.
 */

const ADMIN_BASE = 'https://admin.hlx.page';
const POLL_INTERVAL_MS = 2000;
const JOB_TIMEOUT_MS = 300000;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function startJob({
  operation, org, site, branch, paths, token, logger = console,
}) {
  const url = `${ADMIN_BASE}/${operation}/${org}/${site}/${branch}/*`;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ paths, forceUpdate: true }),
    });
  } catch (error) {
    logger.error(`admin ${operation} request failed: ${error.message}`);
    return { operation, status: 503, detail: error.message };
  }

  const text = await resp.text();
  const body = parse(text);
  if (!resp.ok) {
    logger.error(`admin ${operation} returned ${resp.status}: ${text}`);
    return { operation, status: resp.status, detail: text };
  }

  return {
    operation,
    status: resp.status,
    jobUrl: (body && body.links && body.links.self) || null,
    detail: body || text,
  };
}

/**
 * Polls a bulk job until it stops.
 *
 * The response shape varies between admin API versions, so state and counters are read
 * defensively from either the envelope or a nested `job` object.
 */
async function waitForJob(jobUrl, token, { logger = console, timeoutMs = JOB_TIMEOUT_MS } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    /* eslint-disable no-await-in-loop -- polling is sequential by nature */
    let resp;
    try {
      resp = await fetch(jobUrl, { headers: { 'x-auth-token': token } });
    } catch (error) {
      logger.error(`job poll failed for ${jobUrl}: ${error.message}`);
      return { state: 'unknown', failed: null };
    }

    const body = parse(await resp.text()) || {};
    const job = body.job || body;
    const state = job.state || body.state;
    const progress = job.progress || body.progress || {};

    if (state === 'stopped' || state === 'completed') {
      return {
        state: 'stopped',
        failed: typeof progress.failed === 'number' ? progress.failed : 0,
        total: progress.total,
      };
    }
    if (!resp.ok) {
      logger.error(`job poll returned ${resp.status} for ${jobUrl}`);
      return { state: 'unknown', failed: null };
    }

    await sleep(POLL_INTERVAL_MS);
    /* eslint-enable no-await-in-loop */
  }

  logger.error(`job did not finish within ${timeoutMs}ms: ${jobUrl}`);
  return { state: 'timeout', failed: null };
}

function succeeded(result) {
  if (result.status >= 400) return false;
  // No job URL means we cannot confirm; treat as unverified rather than successful.
  if (!result.job) return false;
  return result.job.state === 'stopped' && result.job.failed === 0;
}

async function runJob(options) {
  const started = await startJob(options);
  if (started.status >= 400 || !started.jobUrl) return started;
  const job = await waitForJob(started.jobUrl, options.token, options);
  return { ...started, job };
}

/**
 * Previews then publishes the given paths, waiting for each job to finish.
 *
 * Publish is skipped when preview did not verifiably succeed: promoting a path whose preview
 * never refreshed would push the previous snapshot live and hide the failure.
 */
export async function refreshPaths(options) {
  const preview = await runJob({ ...options, operation: 'preview' });
  if (!succeeded(preview)) return { preview, live: null, ok: false };
  const live = await runJob({ ...options, operation: 'live' });
  return { preview, live, ok: succeeded(live) };
}

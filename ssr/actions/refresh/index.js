/*
 * Webhook endpoint that re-composes pages after their source data changes.
 *
 * Because the overlay runs at preview/publish time, a product whose data changed keeps
 * serving the previous snapshot until its page is previewed and published again. Point the
 * upstream system's change webhook here with the changed ids.
 */
import { refreshPaths } from '../../src/admin.js';

const JSON_HEADERS = { 'content-type': 'application/json' };

function reply(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body };
}

function toPaths(params) {
  if (Array.isArray(params.paths)) return params.paths.filter(Boolean);
  if (Array.isArray(params.ids)) return params.ids.filter(Boolean).map((id) => `/products/${id}`);
  return [];
}

export async function main(params) {
  const headers = params.__ow_headers || {};
  const secret = params.REFRESH_SECRET;

  // Refresh triggers publishes, so an unauthenticated caller must never reach it.
  if (!secret || headers['x-refresh-secret'] !== secret) {
    return reply(401, { error: 'unauthorized' });
  }
  if (!params.AEM_ADMIN_TOKEN) {
    return reply(500, { error: 'AEM_ADMIN_TOKEN is not configured' });
  }

  const paths = toPaths(params);
  if (!paths.length) {
    return reply(400, { error: 'provide a non-empty "paths" or "ids" array' });
  }

  try {
    const result = await refreshPaths({
      org: params.AEM_ORG,
      site: params.AEM_SITE,
      branch: params.AEM_BRANCH || 'main',
      token: params.AEM_ADMIN_TOKEN,
      paths,
      // Must stay comfortably below the action timeout in app.config.yaml.
      timeoutMs: Number(params.JOB_TIMEOUT_MS) || 120000,
    });
    // result.ok reflects the finished jobs, not just the queued-successfully 202.
    return reply(result.ok ? 200 : 502, { requested: paths.length, ...result });
  } catch (error) {
    return reply(502, { error: error.message });
  }
}

export default main;

/*
 * I/O adapters shared by the App Builder action and the local dev server.
 *
 * Every request is time-bounded. The Admin API is waiting on us during preview and publish,
 * so a hanging upstream must degrade to a fallback rather than stall the ingestion.
 */

const DEFAULT_TIMEOUT_MS = 2000;

async function withTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds a primary-source fetcher for the AEM content source.
 *
 * The AEM Author delivery endpoint is protected, so the caller must pass through the
 * credential the Admin API forwarded on the incoming request.
 */
export function createPrimaryFetcher({
  baseUrl,
  suffix = '',
  authorization = '',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger = console,
}) {
  return async function fetchPrimary(contentPath) {
    const url = `${baseUrl.replace(/\/$/, '')}${contentPath}${suffix}`;
    try {
      const headers = authorization ? { authorization } : {};
      const resp = await withTimeout(url, { headers }, timeoutMs);
      if (!resp.ok) {
        logger.error(`primary source returned ${resp.status} for ${url}`);
        return { status: resp.status, html: '' };
      }
      return { status: 200, html: await resp.text() };
    } catch (error) {
      logger.error(`primary source fetch failed for ${url}: ${error.message}`);
      return { status: 504, html: '' };
    }
  };
}

/** Builds a JSON fetcher for external data endpoints. */
export function createDataFetcher({
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger = console,
} = {}) {
  return async function fetchData(endpoint) {
    try {
      const resp = await withTimeout(endpoint, {
        headers: { accept: 'application/json', ...headers },
      }, timeoutMs);
      if (!resp.ok) {
        logger.error(`data endpoint returned ${resp.status} for ${endpoint}`);
        return null;
      }
      return await resp.json();
    } catch (error) {
      logger.error(`data endpoint fetch failed for ${endpoint}: ${error.message}`);
      return null;
    }
  };
}

/**
 * The Admin API forwards the content-source credential as x-content-source-authorization;
 * html2md then presents it as a plain authorization header. Accept either so the action
 * works whichever way the request arrives.
 */
export function resolveAuthorization(headers = {}) {
  const lookup = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return lookup['x-content-source-authorization'] || lookup.authorization || '';
}

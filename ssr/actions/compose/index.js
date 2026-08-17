/*
 * Adobe I/O Runtime web action registered as the site's BYOM content overlay.
 *
 * The Admin API calls this for every path it previews or publishes, appending the content
 * path to the action URL. Anything this action does not own must 404 as cheaply as
 * possible so the Admin API falls back to the primary AEM content source.
 */
import compose, { OUTCOME } from '../../src/compose.js';
import { createDataFetcher, createPrimaryFetcher, resolveAuthorization } from '../../src/http.js';

const FALLBACK_HEADERS = { 'content-type': 'text/plain; charset=utf-8' };

function logger(level) {
  const levels = ['error', 'warn', 'info', 'debug'];
  const threshold = levels.indexOf(levels.includes(level) ? level : 'info');
  const emit = (name) => (...args) => {
    if (levels.indexOf(name) <= threshold) {
      // eslint-disable-next-line no-console
      console[name === 'debug' ? 'log' : name](...args);
    }
  };
  return {
    error: emit('error'), warn: emit('warn'), info: emit('info'), debug: emit('debug'),
  };
}

export async function main(params) {
  const log = logger(params.LOG_LEVEL);
  const path = params.__ow_path || params.path || '/';
  const headers = params.__ow_headers || {};

  if (!params.PRIMARY_SOURCE_URL) {
    log.error('PRIMARY_SOURCE_URL is not configured; refusing to compose');
    return { statusCode: 404, headers: FALLBACK_HEADERS, body: OUTCOME.NO_ROUTE };
  }

  const timeoutMs = Number(params.FETCH_TIMEOUT_MS) || 2000;

  try {
    const result = await compose({
      path,
      logger: log,
      fetchPrimary: createPrimaryFetcher({
        baseUrl: params.PRIMARY_SOURCE_URL,
        suffix: params.PRIMARY_SOURCE_SUFFIX || '',
        authorization: resolveAuthorization(headers),
        timeoutMs,
        logger: log,
      }),
      fetchData: createDataFetcher({ timeoutMs, logger: log }),
    });

    if (result.status !== 200) {
      log.info(`overlay declined ${path}: ${result.outcome}`);
      return { statusCode: 404, headers: FALLBACK_HEADERS, body: result.outcome };
    }

    log.info(`overlay composed ${path}`);
    return { statusCode: 200, headers: result.headers, body: result.body };
  } catch (error) {
    /*
     * An unexpected fault must not block a publish. 404 makes the Admin API ingest the
     * unmodified AEM page, and client-side hydration still fills the blocks for visitors.
     */
    log.error(`overlay failed for ${path}: ${error.stack || error.message}`);
    return { statusCode: 404, headers: FALLBACK_HEADERS, body: 'compose-error' };
  }
}

export default main;

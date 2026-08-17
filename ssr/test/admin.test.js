import test from 'node:test';
import assert from 'node:assert/strict';

import { refreshPaths } from '../src/admin.js';

const silent = { error: () => {}, info: () => {} };

/**
 * Installs a fetch stub for the duration of a test and records every call.
 * @param {function} handler (url, options) => {status, body}
 */
function withFetch(handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    const { status = 200, body = {} } = handler(String(url), options) || {};
    return {
      ok: status < 400,
      status,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    };
  };
  return {
    calls,
    restore: () => { globalThis.fetch = original; },
  };
}

const base = {
  org: 'acme', site: 'site', branch: 'main', token: 't', paths: ['/products/1'], logger: silent,
};

const jobUrl = 'https://admin.hlx.page/job/preview/job-1';
const queued = { status: 202, body: { links: { self: jobUrl } } };

test('a finished job with no failures is a success and triggers publish', async () => {
  const stub = withFetch((url, options) => {
    if (options.method === 'POST') return queued;
    return { status: 200, body: { state: 'stopped', progress: { total: 1, failed: 0 } } };
  });
  try {
    const result = await refreshPaths(base);
    assert.equal(result.ok, true);
    assert.equal(result.preview.job.state, 'stopped');
    assert.ok(result.live, 'publish ran');
    const posts = stub.calls.filter((call) => call.method === 'POST').map((call) => call.url);
    assert.ok(posts.some((url) => url.includes('/preview/')));
    assert.ok(posts.some((url) => url.includes('/live/')));
  } finally {
    stub.restore();
  }
});

/*
 * The bulk endpoints answer 202 even for a request that later fails, so accepting 202 as
 * success would publish a stale snapshot and hide the failure.
 */
test('a 202 whose job reports failures does not publish', async () => {
  const stub = withFetch((url, options) => {
    if (options.method === 'POST') return queued;
    return { status: 200, body: { state: 'stopped', progress: { total: 1, failed: 1 } } };
  });
  try {
    const result = await refreshPaths(base);
    assert.equal(result.ok, false);
    assert.equal(result.live, null, 'publish was skipped');
    assert.ok(!stub.calls.some((call) => call.url.includes('/live/')));
  } finally {
    stub.restore();
  }
});

test('a rejected bulk request does not publish', async () => {
  const stub = withFetch((url, options) => {
    if (options.method === 'POST') return { status: 401, body: 'unauthorized' };
    return { status: 200, body: {} };
  });
  try {
    const result = await refreshPaths(base);
    assert.equal(result.ok, false);
    assert.equal(result.preview.status, 401);
    assert.equal(result.live, null);
  } finally {
    stub.restore();
  }
});

test('a response without a job link is treated as unverified, not successful', async () => {
  const stub = withFetch((url, options) => {
    if (options.method === 'POST') return { status: 202, body: { messageId: 'abc' } };
    return { status: 200, body: { state: 'stopped', progress: { failed: 0 } } };
  });
  try {
    const result = await refreshPaths(base);
    assert.equal(result.ok, false);
    assert.equal(result.live, null);
  } finally {
    stub.restore();
  }
});

test('job state nested under a job envelope is understood', async () => {
  const stub = withFetch((url, options) => {
    if (options.method === 'POST') return queued;
    return { status: 200, body: { job: { state: 'stopped', progress: { failed: 0 } } } };
  });
  try {
    const result = await refreshPaths(base);
    assert.equal(result.ok, true);
  } finally {
    stub.restore();
  }
});

test('polling gives up rather than hanging, and does not publish', async () => {
  const stub = withFetch((url, options) => {
    if (options.method === 'POST') return queued;
    return { status: 200, body: { state: 'running', progress: { failed: 0 } } };
  });
  try {
    const result = await refreshPaths({ ...base, timeoutMs: 10 });
    assert.equal(result.ok, false);
    assert.equal(result.preview.job.state, 'timeout');
    assert.equal(result.live, null);
  } finally {
    stub.restore();
  }
});

test('a network failure while starting a job is reported, not thrown', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('ECONNRESET'); };
  try {
    const result = await refreshPaths(base);
    assert.equal(result.ok, false);
    assert.equal(result.preview.status, 503);
  } finally {
    globalThis.fetch = original;
  }
});

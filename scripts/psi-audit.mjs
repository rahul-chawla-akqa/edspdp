#!/usr/bin/env node
/*
 * Runs Google PageSpeed Insights (hosted Lighthouse) against preview URLs.
 *
 *   PSI_API_KEY=... PSI_BASE_URL=https://main--edspdp--rahul-chawla-akqa.aem.page \
 *     PSI_PATHS=/,/products/1 npm run psi
 *
 * Writes psi-reports/*.json, psi-reports/comment.md, and psi-reports/summary.json.
 * Exits 1 if any Lighthouse category score is below PSI_MIN_SCORE (default 0.90).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const BASE_URL = (process.env.PSI_BASE_URL
  || 'https://main--edspdp--rahul-chawla-akqa.aem.page').replace(/\/$/, '');
const PATHS = (process.env.PSI_PATHS || '/,/products/1')
  .split(',')
  .map((path) => path.trim())
  .filter(Boolean)
  .map((path) => (path.startsWith('/') ? path : `/${path}`));
const STRATEGIES = (process.env.PSI_STRATEGIES || 'mobile,desktop')
  .split(',')
  .map((strategy) => strategy.trim())
  .filter(Boolean);
const MIN_SCORE = Number(process.env.PSI_MIN_SCORE || 0.9);
const API_KEY = process.env.PSI_API_KEY || process.env.GOOGLE_PSI_API_KEY || '';
const OUT_DIR = resolve(process.env.PSI_OUT_DIR || 'psi-reports');
const MAX_ATTEMPTS = Number(process.env.PSI_RETRIES || 3);

function toPageUrl(path) {
  if (path === '/') return `${BASE_URL}/`;
  return `${BASE_URL}${path}`;
}

function scoreToDisplay(score) {
  if (typeof score !== 'number') return 'n/a';
  return String(Math.round(score * 100));
}

function psiReportUrl(pageUrl, strategy) {
  const params = new URLSearchParams({
    url: pageUrl,
    form_factor: strategy,
  });
  return `https://pagespeed.web.dev/analysis?${params.toString()}`;
}

function slug(pageUrl, strategy) {
  return `${strategy}-${pageUrl.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-')}`
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

async function sleep(ms) {
  await new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function fetchPsi(pageUrl, strategy) {
  const params = new URLSearchParams({
    url: pageUrl,
    strategy,
  });
  CATEGORIES.forEach((category) => params.append('category', category));
  if (API_KEY) params.set('key', API_KEY);

  const response = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
    signal: AbortSignal.timeout(180000),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: { message: text.slice(0, 500) } };
  }
  return { status: response.status, body };
}

function extractScores(lighthouseResult) {
  const cats = lighthouseResult?.categories || {};
  return CATEGORIES.reduce((acc, id) => {
    acc[id] = typeof cats[id]?.score === 'number' ? cats[id].score : null;
    return acc;
  }, {});
}

function belowBudget(scores) {
  return CATEGORIES.some((id) => typeof scores[id] === 'number' && scores[id] < MIN_SCORE);
}

async function auditOne(pageUrl, strategy) {
  let lastError = 'unknown error';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { status, body } = await fetchPsi(pageUrl, strategy);
      if (status === 429 || status >= 500) {
        lastError = `HTTP ${status}: ${body?.error?.message || 'retryable'}`;
      } else if (!body?.lighthouseResult) {
        lastError = body?.error?.message || `HTTP ${status}: no lighthouseResult`;
      } else {
        return {
          url: pageUrl,
          strategy,
          scores: extractScores(body.lighthouseResult),
          fetchTime: body.analysisUTCTimestamp || body.lighthouseResult.fetchTime,
          reportUrl: psiReportUrl(pageUrl, strategy),
          raw: body,
        };
      }
    } catch (err) {
      lastError = err.message;
    }
    if (attempt < MAX_ATTEMPTS) {
      const waitMs = 5000 * attempt;
      console.error(`Retry ${attempt}/${MAX_ATTEMPTS} for ${strategy} ${pageUrl}: ${lastError}`);
      await sleep(waitMs);
    }
  }
  return {
    url: pageUrl,
    strategy,
    scores: CATEGORIES.reduce((acc, id) => {
      acc[id] = null;
      return acc;
    }, {}),
    error: lastError,
    reportUrl: psiReportUrl(pageUrl, strategy),
  };
}

function markdownTable(results) {
  const header = [
    '| Path | Form factor | Performance | Accessibility | Best Practices | SEO | Report |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- |',
  ];
  const rows = results.map((result) => {
    const path = new URL(result.url).pathname || '/';
    const failed = result.error || belowBudget(result.scores);
    const mark = failed ? ' **fail**' : '';
    const cells = CATEGORIES.map((id) => scoreToDisplay(result.scores[id])).join(' | ');
    const link = `[open](${result.reportUrl})`;
    return `| \`${path}\` | ${result.strategy}${mark} | ${cells} | ${link} |`;
  });
  return [...header, ...rows].join('\n');
}

function buildComment(results, failed) {
  const budgetPct = Math.round(MIN_SCORE * 100);
  const status = failed ? 'failed budget' : 'passed';
  return [
    '<!-- psi-audit-comment -->',
    `## PageSpeed Insights (${status})`,
    '',
    `Lab Lighthouse via the PageSpeed Insights API (mobile + desktop). Fail if any category is below **${budgetPct}**.`,
    '',
    `Base URL: \`${BASE_URL}\``,
    '',
    markdownTable(results),
    '',
    results.some((result) => result.error)
      ? `Errors:\n${results.filter((result) => result.error).map((result) => `- ${result.strategy} ${result.url}: ${result.error}`).join('\n')}\n`
      : '',
    'SEO here is technical SEO (title, crawlability, canonical, viewport), not search rankings.',
    '',
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });

const jobs = [];
PATHS.forEach((path) => {
  STRATEGIES.forEach((strategy) => {
    jobs.push({ path, strategy, url: toPageUrl(path) });
  });
});

console.log(`PSI audit: ${jobs.length} run(s) against ${BASE_URL}`);
if (!API_KEY) {
  console.error('PSI_API_KEY is not set; using anonymous quota (may 429).');
}

const results = [];
for (let i = 0; i < jobs.length; i += 1) {
  const job = jobs[i];
  console.log(`[${i + 1}/${jobs.length}] ${job.strategy} ${job.url}`);
  const result = await auditOne(job.url, job.strategy);
  results.push(result);
  const fileBase = slug(job.url, job.strategy);
  if (result.raw) {
    writeFileSync(resolve(OUT_DIR, `${fileBase}.json`), JSON.stringify(result.raw, null, 2));
    delete result.raw;
  } else {
    writeFileSync(resolve(OUT_DIR, `${fileBase}.json`), JSON.stringify(result, null, 2));
  }
  if (i < jobs.length - 1) await sleep(1500);
}

const failed = results.some((result) => result.error || belowBudget(result.scores));
const comment = buildComment(results, failed);
const summary = {
  baseUrl: BASE_URL,
  minScore: MIN_SCORE,
  failed,
  results: results.map((result) => ({
    url: result.url,
    strategy: result.strategy,
    scores: result.scores,
    error: result.error || undefined,
    reportUrl: result.reportUrl,
    fetchTime: result.fetchTime,
  })),
};

writeFileSync(resolve(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
writeFileSync(resolve(OUT_DIR, 'comment.md'), comment);
console.log(`\n${comment}`);

if (failed) {
  console.error(`PSI budget missed (min ${MIN_SCORE}).`);
  process.exit(1);
}

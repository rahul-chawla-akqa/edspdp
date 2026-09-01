// @ts-check
/**
 * Local Lighthouse CI config (lab scores, not PSI).
 *
 *   npm run lighthouse
 *   npm run lighthouse:desktop
 *
 * Starts aem-cli on port 3002 with --html-folder drafts so homepage (/) and
 * local modal drafts are both reachable. If a server is already running:
 *
 *   LIGHTHOUSE_BASE_URL=http://localhost:3001 npm run lighthouse
 *
 * Appends ?lighthouse=on (see scripts/aem.js). Reports: lighthouse-reports/
 */
const BASE_URL = (process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const startOwnServer = !process.env.LIGHTHOUSE_BASE_URL;
const isDesktop = process.env.LIGHTHOUSE_PRESET === 'desktop';
const numberOfRuns = Number(process.env.LIGHTHOUSE_RUNS || 1);

const PAGES = [
  '/',
  '/drafts/modals/welcome',
  '/drafts/modals/find-dealers',
  '/drafts/modals/find-my-tyre',
  '/drafts/modals/for-personal',
  '/drafts/modals/for-commercial',
  '/drafts/modals/for-agriculture',
  '/drafts/modals/help-support',
];

/**
 * @param {string} path
 * @returns {string}
 */
function withLighthouseFlag(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${BASE_URL}${path}${separator}lighthouse=on`;
}

module.exports = {
  ci: {
    collect: {
      url: PAGES.map(withLighthouseFlag),
      numberOfRuns,
      ...(startOwnServer
        ? {
          startServerCommand:
            'npx -y @adobe/aem-cli up --no-open --html-folder drafts --port 3002 --stop-other false',
          startServerReadyPattern: 'up and running',
          startServerReadyTimeout: 120000,
        }
        : {}),
      settings: {
        ...(isDesktop ? { preset: 'desktop' } : {}),
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        chromeFlags: '--headless --disable-gpu --no-sandbox',
      },
    },
    assert: {
      // Local lab scores are volatile vs PSI on .aem.page. Warn only so reports always land.
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
  },
};

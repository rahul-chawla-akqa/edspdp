// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx -y @adobe/aem-cli up --no-open --html-folder drafts --port 3001 --stop-other false',
    url: 'http://localhost:3001/drafts/carousel',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

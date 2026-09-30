const path = require('path');

const root = path.resolve(__dirname, '..');

// Path the build is served from, e.g. `/sb/pr-42/` on the shared `sb-previews` branch.
// Runtime block/icon loads are prefixed with it through `window.hlx.codeBasePath`.
const base = `/${(process.env.STORYBOOK_BASE || '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

// Every build ships its own copy of these so it stays self-contained under `base`.
const staticDirs = [
  { from: '../icons', to: '/icons' },
  { from: '../blocks', to: '/blocks' },
  { from: '../scripts', to: '/scripts' },
  { from: '../fonts', to: '/fonts' },
  { from: '../storybook/fixtures/static', to: '/storybook-fixtures' },
];

/** @type { import('@storybook/html-vite').StorybookConfig } */
module.exports = {
  stories: ['../storybook/stories/**/*.stories.js'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  staticDirs,
  previewHead: (head) => head.replace(/%STORYBOOK_BASE%/g, base),
  async viteFinal(config) {
    config.server = config.server || {};
    config.server.fs = {
      ...(config.server.fs || {}),
      allow: [root],
    };
    config.plugins = config.plugins || [];
    config.plugins.push({
      name: 'storybook-eds-shims',
      transform(code, id) {
        const normalized = id.replace(/\\/g, '/');
        const file = normalized.split('?')[0];
        if (file.endsWith('/scripts/scripts.js')) {
          return code.replace(/\nloadPage\(\);/, '\nif (!window.IS_STORYBOOK) loadPage();');
        }
        // loadBlock resolves block JS at runtime from /blocks; Vite cannot analyze that path.
        if (file.endsWith('/scripts/aem.js')) {
          return code.replace(
            'const mod = await import(',
            'const mod = await import(/* @vite-ignore */',
          );
        }
        return null;
      },
    });
    return config;
  },
};

const path = require('path');

const root = path.resolve(__dirname, '..');

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
  staticDirs: [
    { from: '../icons', to: '/icons' },
    { from: '../blocks', to: '/blocks' },
    { from: '../scripts', to: '/scripts' },
    { from: '../fonts', to: '/fonts' },
    { from: '../storybook/fixtures/static', to: '/storybook-fixtures' },
  ],
  async viteFinal(config) {
    config.server = config.server || {};
    config.server.fs = {
      ...(config.server.fs || {}),
      allow: [root],
    };
    config.plugins = config.plugins || [];
    config.plugins.push({
      name: 'storybook-skip-eds-load-page',
      transform(code, id) {
        const normalized = id.replace(/\\/g, '/');
        if (normalized.split('?')[0].endsWith('/scripts/scripts.js')) {
          return code.replace(/\nloadPage\(\);/, '\nif (!window.IS_STORYBOOK) loadPage();');
        }
        return null;
      },
    });
    return config;
  },
};

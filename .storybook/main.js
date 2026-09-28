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

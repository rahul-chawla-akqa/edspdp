module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
  },
  overrides: [
    {
      // Server-side overlay composer and its local dev harness: Node, not the browser.
      files: ['ssr/**/*.js', 'ssr/**/*.mjs', 'dev/**/*.mjs'],
      env: {
        browser: false,
        node: true,
        es2022: true,
      },
      rules: {
        // The composer deliberately imports the same renderers the blocks use, so one
        // markup implementation serves both the server and the client.
        'import/no-relative-packages': 'off',
        // Logs are the only observability an Adobe I/O Runtime action has.
        'no-console': 'off',
        /*
         * ssr/ is a separate package with its own dependencies, installed by
         * `npm ci --prefix ssr`. AEM Code Sync and the root lint job only install the root
         * node_modules, so bare specifiers here are unresolvable to them. Relative paths are
         * still checked, which is what matters: those include the cross-package imports of
         * scripts/renderers/. Bare specifiers are verified by `npm run test:ssr`, which
         * fails immediately if a package name is wrong.
         */
        'import/no-unresolved': ['error', { ignore: ['^[^./]'] }],
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['ssr/actions/**/*.js'],
      rules: {
        // OpenWhisk supplies request context as __ow_path / __ow_headers.
        'no-underscore-dangle': 'off',
      },
    },
    {
      files: ['ssr/src/admin.js'],
      rules: {
        // Kept as a named export so more admin operations can be added alongside it.
        'import/prefer-default-export': 'off',
      },
    },
  ],
};

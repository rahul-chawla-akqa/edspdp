import '../styles/styles.css';
import '../styles/lazy-styles.css';
import '../styles/fonts.css';
import { installFetchStub } from '../storybook/fetch-stub.js';
import { edsViewports } from '../storybook/stories/_shared.js';
import { bindModalTriggers } from '../blocks/modal/modal.js';

installFetchStub();
bindModalTriggers();

document.body.classList.add('appear');

// same brand classes scripts.js puts on <body> from the page `theme` metadata
const THEME_CLASSES = ['apollo', 'vredestein', 'corporate'];

function applyTheme(theme) {
  THEME_CLASSES.forEach((name) => document.body.classList.remove(name));
  const next = THEME_CLASSES.includes(theme) ? theme : 'apollo';
  document.body.classList.add(next, 'appear');
}

/** @type { import('@storybook/html').Preview } */
const preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Brand theme (body class, same as EDS page metadata)',
      defaultValue: 'apollo',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'apollo', title: 'Apollo Tyres' },
          { value: 'vredestein', title: 'Vredestein' },
          { value: 'corporate', title: 'Corporate' },
        ],
        dynamicTitle: true,
      },
    },
    viewportMode: {
      name: 'Viewport',
      description: 'EDS breakpoint: mobile max 600px, desktop greater than 600px',
      defaultValue: 'mobile',
      toolbar: {
        icon: 'mobile',
        items: [
          { value: 'mobile', title: 'Mobile (≤600px)' },
          { value: 'desktop', title: 'Desktop (>600px)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'fullscreen',
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: { matchers: { color: /(background|color)$/i } },
    viewport: {
      viewports: edsViewports,
      defaultViewport: 'mobile',
    },
    backgrounds: { disable: true },
    a11y: {
      context: '#storybook-root',
    },
  },
  decorators: [
    (story, context) => {
      applyTheme(context.globals.theme);
      const explicit = context.parameters.viewport?.defaultViewport;
      const mode = explicit || context.globals.viewportMode || 'mobile';
      context.parameters.viewport = {
        ...(context.parameters.viewport || {}),
        viewports: edsViewports,
        defaultViewport: mode,
      };
      return story();
    },
  ],
};

export default preview;

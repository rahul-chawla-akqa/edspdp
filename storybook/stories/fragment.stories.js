import decorate from '../../blocks/fragment/fragment.js';
import { renderBlock } from '../decorate.js';
import { link, row } from '../markup.js';
import { blockStory, desktopParameters, mobileParameters } from './_shared.js';

const html = row(link('/modals/sample', '/modals/sample'));

export default {
  title: 'Blocks/Fragment',
};

export const Docs = {
  render: () => {
    const article = document.createElement('article');
    article.style.padding = '1.5rem';
    article.innerHTML = `
      <h2>Fragment</h2>
      <p>This block fetches <code>{path}.plain.html</code> and inlines it. Storybook stubs
      that request so the embed below is fixture HTML, not a live AEM page.</p>
    `;
    return article;
  },
};

export const FixtureEmbed = {
  name: 'Fixture embed',
  ...blockStory(() => renderBlock({ name: 'fragment', html, decorate })),
};

export const Mobile = {
  ...FixtureEmbed,
  name: 'Mobile',
  parameters: mobileParameters,
};

export const Desktop = {
  ...FixtureEmbed,
  name: 'Desktop',
  parameters: desktopParameters,
};

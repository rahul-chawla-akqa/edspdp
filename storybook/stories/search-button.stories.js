import decorate from '../../blocks/search-button/search-button.js';
import { renderBlock } from '../decorate.js';
import { link, row } from '../markup.js';
import { blockStory, desktopParameters, mobileParameters } from './_shared.js';

const html = row(link('/modals/search', 'Search the catalog', 'Search'));

export default {
  title: 'Blocks/Search Button',
};

export const Standard = blockStory(() => renderBlock({ name: 'search-button', html, decorate }));

export const Wide = blockStory(() => renderBlock({
  name: 'search-button',
  html,
  classes: ['wide'],
  decorate,
}));

export const Mobile = {
  ...Standard,
  name: 'Mobile',
  parameters: mobileParameters,
};

export const Desktop = {
  ...Standard,
  name: 'Desktop',
  parameters: desktopParameters,
};

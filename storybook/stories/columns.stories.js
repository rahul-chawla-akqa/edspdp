import decorate from '../../blocks/columns/columns.js';
import { renderBlock } from '../decorate.js';
import { images, picture, row } from '../markup.js';
import { blockStory, desktopParameters, mobileParameters } from './_shared.js';

const twoCol = row(
  '<h2>Left column</h2><p>Two-column layout. JS adds <code>columns-2-cols</code>.</p>',
  `${picture(images.card1, 'Column image')}`,
);

const threeCol = row(
  '<h3>One</h3><p>First column.</p>',
  '<h3>Two</h3><p>Second column.</p>',
  '<h3>Three</h3><p>Third column.</p>',
);

export default {
  title: 'Blocks/Columns',
};

export const TwoColumns = {
  name: '2 columns',
  ...blockStory(() => renderBlock({ name: 'columns', html: twoCol, decorate })),
};

export const ThreeColumns = {
  name: '3 columns',
  ...blockStory(() => renderBlock({ name: 'columns', html: threeCol, decorate })),
};

export const Mobile = {
  ...TwoColumns,
  name: 'Mobile',
  parameters: mobileParameters,
};

export const Desktop = {
  ...TwoColumns,
  name: 'Desktop',
  parameters: desktopParameters,
};

import decorate from '../../blocks/card-gallery/card-gallery.js';
import { renderBlock } from '../decorate.js';
import {
  images, link, picture, row,
} from '../markup.js';
import { blockStory, desktopParameters, mobileParameters } from './_shared.js';

function galleryHtml(ratio) {
  return [
    row(picture(images.card1, 'Square card'), 'Square', link('/modals/sample', 'Open', 'Square'), ratio || 'ratio-1-1'),
    row(picture(images.card2, 'Wide card'), 'Wide', link('/modals/sample', 'Open', 'Wide'), 'ratio-2-1'),
    row(picture(images.card3, 'Tall card'), 'Tall', link('/modals/sample', 'Open', 'Tall'), 'ratio-1-2'),
  ].join('');
}

export default {
  title: 'Blocks/Card Gallery',
  argTypes: {
    ratio: {
      name: 'Lead card ratio',
      control: 'select',
      options: ['ratio-1-1', 'ratio-2-1', 'ratio-1-2'],
    },
  },
  args: { ratio: 'ratio-1-1' },
};

export const Default = blockStory(({ ratio }) => renderBlock({
  name: 'card-gallery',
  html: galleryHtml(ratio),
  decorate,
}));

export const Ratio11 = {
  name: 'Ratio 1:1',
  ...blockStory(() => renderBlock({
    name: 'card-gallery',
    html: galleryHtml('ratio-1-1'),
    decorate,
  })),
};

export const Ratio21 = {
  name: 'Ratio 2:1',
  ...blockStory(() => renderBlock({
    name: 'card-gallery',
    html: galleryHtml('ratio-2-1'),
    decorate,
  })),
};

export const Ratio12 = {
  name: 'Ratio 1:2',
  ...blockStory(() => renderBlock({
    name: 'card-gallery',
    html: galleryHtml('ratio-1-2'),
    decorate,
  })),
};

export const Mobile = {
  ...Default,
  name: 'Mobile',
  parameters: mobileParameters,
};

export const Desktop = {
  ...Default,
  name: 'Desktop',
  parameters: desktopParameters,
};

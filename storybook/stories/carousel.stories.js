import decorate from '../../blocks/carousel/carousel.js';
import { renderBlock } from '../decorate.js';
import { images, picture, row } from '../markup.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = [
  row(picture(images.hero, 'Slide one'), '<h2>First slide</h2><p>Use next/prev to change slides.</p>'),
  row(picture(images.card2, 'Slide two'), '<h2>Second slide</h2><p>Keyboard arrows also work.</p>'),
  row(picture(images.card3, 'Slide three'), '<h2>Third slide</h2><p>Indicators stay in sync.</p>'),
].join('');

const base = blockStory(() => renderBlock({ name: 'carousel', html, decorate }));

export default {
  title: 'Blocks/Carousel',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

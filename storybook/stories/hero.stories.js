import decorate from '../../blocks/hero/hero.js';
import { renderBlock } from '../decorate.js';
import { images, picture, row } from '../markup.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = [
  row(picture(images.hero, 'Hero fixture')),
  row('<h1>Build faster pages</h1><p>Hero is CSS-only; decorate() is a noop.</p>'),
].join('');

const base = blockStory(() => renderBlock({ name: 'hero', html, decorate }));

export default {
  title: 'Blocks/Hero',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

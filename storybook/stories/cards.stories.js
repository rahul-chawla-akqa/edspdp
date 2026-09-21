import decorate from '../../blocks/cards/cards.js';
import { renderBlock } from '../decorate.js';
import { images, picture, row } from '../markup.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = [
  row(picture(images.card1, 'Card one'), '<h3>First card</h3><p>Fixture card body.</p>'),
  row(picture(images.card2, 'Card two'), '<h3>Second card</h3><p>Another fixture card.</p>'),
  row(picture(images.card3, 'Card three'), '<h3>Third card</h3><p>Grid wraps on mobile.</p>'),
].join('');

const base = blockStory(() => renderBlock({ name: 'cards', html, decorate }));

export default {
  title: 'Blocks/Cards',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

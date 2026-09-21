import decorate from '../../blocks/header/header.js';
import { renderBlock } from '../decorate.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const base = blockStory(() => renderBlock({
  name: 'header',
  decorate,
  landmark: 'header',
}));

export default {
  title: 'Blocks/Header',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

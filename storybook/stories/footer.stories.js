import decorate from '../../blocks/footer/footer.js';
import { renderBlock } from '../decorate.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const base = blockStory(() => renderBlock({
  name: 'footer',
  decorate,
  landmark: 'footer',
}));

export default {
  title: 'Blocks/Footer',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

import decorate from '../../blocks/post-body/post-body.js';
import { renderBlock } from '../decorate.js';
import { post } from '../fixtures/product.js';
import renderPostBody from '../../scripts/renderers/post-body.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = renderPostBody(post);

const base = blockStory(() => renderBlock({
  name: 'post-body',
  html,
  classes: ['api-rendered'],
  decorate,
}));

export default {
  title: 'Blocks/Post Body',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

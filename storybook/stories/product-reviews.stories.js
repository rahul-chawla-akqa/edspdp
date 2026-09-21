import decorate from '../../blocks/product-reviews/product-reviews.js';
import { renderBlock } from '../decorate.js';
import { product } from '../fixtures/product.js';
import renderProductReviews from '../../scripts/renderers/product-reviews.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = renderProductReviews(product);

const base = blockStory(() => renderBlock({
  name: 'product-reviews',
  html,
  classes: ['api-rendered'],
  decorate,
}));

export default {
  title: 'Blocks/Product Reviews',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

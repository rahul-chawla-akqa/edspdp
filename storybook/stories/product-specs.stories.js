import decorate from '../../blocks/product-specs/product-specs.js';
import { renderBlock } from '../decorate.js';
import { product } from '../fixtures/product.js';
import renderProductSpecs from '../../scripts/renderers/product-specs.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = renderProductSpecs(product);

const base = blockStory(() => renderBlock({
  name: 'product-specs',
  html,
  classes: ['api-rendered'],
  decorate,
}));

export default {
  title: 'Blocks/Product Specs',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

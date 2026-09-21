import decorate from '../../blocks/product-gallery/product-gallery.js';
import { renderBlock } from '../decorate.js';
import { product } from '../fixtures/product.js';
import renderProductGallery from '../../scripts/renderers/product-gallery.js';
import { blockStory, desktopStory, mobileStory } from './_shared.js';

const html = renderProductGallery(product);

const base = blockStory(() => renderBlock({
  name: 'product-gallery',
  html,
  classes: ['api-rendered'],
  decorate,
}));

export default {
  title: 'Blocks/Product Gallery',
};

export const Default = base;
export const Mobile = mobileStory(base);
export const Desktop = desktopStory(base);

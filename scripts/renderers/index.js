import renderProductSpecs from './product-specs.js';
import renderProductGallery from './product-gallery.js';
import renderProductReviews from './product-reviews.js';
import renderProductSeo from './product-seo.js';

/*
 * Registry keyed by the names used in ssr/src/routes.json. Adding a page type means adding
 * a renderer here and referencing it from a route entry -- no composer changes required.
 */
export const blockRenderers = {
  productSpecs: renderProductSpecs,
  productGallery: renderProductGallery,
  productReviews: renderProductReviews,
};

export const seoRenderers = {
  productSeo: renderProductSeo,
};

import { labelledRows } from './html.js';

function dimensions(value) {
  if (!value) return '';
  const { width, height, depth } = value;
  if ([width, height, depth].some((side) => side === undefined || side === null)) return '';
  return `${width} x ${height} x ${depth} cm`;
}

/*
 * Price and stock are intentionally absent. They change independently of the publish
 * cycle, so baking them into the page would ship stale numbers; they belong in a
 * client-hydrated block instead.
 */
export default function renderProductSpecs(data) {
  if (!data) return '';
  return labelledRows([
    ['Brand', data.brand],
    ['SKU', data.sku],
    ['Category', data.category],
    ['Weight', data.weight ? `${data.weight} g` : ''],
    ['Dimensions', dimensions(data.dimensions)],
    ['Warranty', data.warrantyInformation],
    ['Shipping', data.shippingInformation],
    ['Returns', data.returnPolicy],
    ['Minimum order', data.minimumOrderQuantity],
    ['Tags', Array.isArray(data.tags) ? data.tags.join(', ') : ''],
  ]);
}

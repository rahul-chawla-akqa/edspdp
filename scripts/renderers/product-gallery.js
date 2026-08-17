import { image, row } from './html.js';

export default function renderProductGallery(data) {
  if (!data) return '';
  const sources = Array.isArray(data.images) && data.images.length
    ? data.images
    : [data.thumbnail].filter(Boolean);
  return sources
    .map((src, index) => row(image(src, data.title, index === 0)))
    .join('');
}

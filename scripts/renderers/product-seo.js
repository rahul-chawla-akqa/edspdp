/*
 * SEO output for a product page.
 *
 * Each descriptor carries its own conflict policy so the rule is visible where it is
 * decided rather than buried in the composer:
 *   replace - the API is authoritative (a product's name and description are its SEO copy)
 *   fill    - only written when the authored page left it empty
 */
export default function renderProductSeo(data) {
  if (!data) return null;

  const title = data.title || '';
  const description = data.description || '';
  const thumbnail = data.thumbnail || (Array.isArray(data.images) ? data.images[0] : '');

  const meta = [
    { name: 'description', content: description, mode: 'replace' },
    { property: 'og:title', content: title, mode: 'replace' },
    { property: 'og:description', content: description, mode: 'replace' },
    { property: 'og:type', content: 'product', mode: 'fill' },
    { property: 'og:image', content: thumbnail, mode: 'replace' },
    { name: 'twitter:title', content: title, mode: 'replace' },
    { name: 'twitter:description', content: description, mode: 'replace' },
    { name: 'twitter:image', content: thumbnail, mode: 'replace' },
    { name: 'keywords', content: (data.tags || []).join(', '), mode: 'fill' },
  ].filter((entry) => entry.content);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description,
    sku: data.sku,
    image: Array.isArray(data.images) && data.images.length ? data.images : undefined,
    brand: data.brand ? { '@type': 'Brand', name: data.brand } : undefined,
    aggregateRating: data.rating && data.reviews && data.reviews.length
      ? {
        '@type': 'AggregateRating',
        ratingValue: data.rating,
        reviewCount: data.reviews.length,
      }
      : undefined,
  };

  return { title, meta, jsonLd };
}

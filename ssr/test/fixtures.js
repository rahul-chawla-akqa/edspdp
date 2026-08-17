/*
 * Page shell copied from the real output of
 * https://main--edspdp--rahul-chawla-akqa.aem.page/product-page
 * so tests exercise the structure the composer actually receives.
 *
 * Block rows follow the xwalk convention confirmed on the live site: one
 * <div><div>value</div></div> row per model field.
 */
export function authoredPage({ blocks = '', meta = '' } = {}) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>product page</title>
    <link rel="canonical" href="https://main--edspdp--rahul-chawla-akqa.aem.page/products/1">
    <meta property="og:title" content="product page">
    <meta name="twitter:title" content="product page">
    ${meta}
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <header></header>
    <main>
      <div>
        <h1 id="product-page">Product Page</h1>
      </div>
      <div>
${blocks}
      </div>
    </main>
    <footer></footer>
  </body>
</html>`;
}

export function placeholder(className, authoredId = '') {
  return `        <div class="${className}">
          <div>
            <div>${authoredId}</div>
          </div>
        </div>`;
}

export const product = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'A popular mascara known for its volumizing effects.',
  category: 'beauty',
  price: 9.99,
  rating: 2.56,
  stock: 99,
  tags: ['beauty', 'mascara'],
  brand: 'Essence',
  sku: 'BEA-ESS-ESS-001',
  weight: 4,
  dimensions: { width: 15.14, height: 13.08, depth: 22.99 },
  warrantyInformation: '1 week warranty',
  shippingInformation: 'Ships in 3-5 business days',
  returnPolicy: 'No return policy',
  minimumOrderQuantity: 48,
  availabilityStatus: 'In Stock',
  reviews: [
    {
      rating: 3,
      comment: 'Would not recommend!',
      date: '2025-04-30T09:41:02.053Z',
      reviewerName: 'Eleanor Collins',
    },
    {
      rating: 5,
      comment: 'Highly impressed!',
      date: '2025-04-30T09:41:02.053Z',
      reviewerName: 'Lucas Gordon',
    },
  ],
  images: [
    'https://cdn.dummyjson.com/product-images/beauty/essence/1.webp',
    'https://cdn.dummyjson.com/product-images/beauty/essence/2.webp',
  ],
  thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence/thumbnail.webp',
};

/** Records calls so tests can assert the composer's short-circuit behaviour. */
export function stubs({ primary, data = product } = {}) {
  const calls = { primary: [], data: [] };
  return {
    calls,
    fetchPrimary: async (path) => {
      calls.primary.push(path);
      return primary || { status: 404, html: '' };
    },
    fetchData: async (endpoint) => {
      calls.data.push(endpoint);
      return data;
    },
    logger: { error: () => {}, info: () => {} },
  };
}

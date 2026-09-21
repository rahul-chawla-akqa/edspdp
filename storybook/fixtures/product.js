/**
 * Product JSON used by Storybook product blocks. Same shape as dummyjson / SSR fixtures.
 */
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
    '/storybook-fixtures/product-1.svg',
    '/storybook-fixtures/product-2.svg',
  ],
  thumbnail: '/storybook-fixtures/product-1.svg',
};

export const post = {
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto',
  userId: 1,
};

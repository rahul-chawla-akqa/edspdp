import { hydrate } from '../../scripts/product-data.js';
import renderProductReviews from '../../scripts/renderers/product-reviews.js';

export default async function decorate(block) {
  const hasContent = await hydrate(block, renderProductReviews);
  if (!hasContent) return;

  // Row contract from the renderer: first row is the aggregate summary, the rest are reviews.
  const [summaryRow, ...reviewRows] = [...block.children];
  const fragment = document.createDocumentFragment();

  if (summaryRow) {
    const summary = document.createElement('div');
    summary.className = 'product-reviews-summary';
    const [label, value] = summaryRow.children;
    if (label) {
      label.className = 'product-reviews-summary-label';
      summary.append(label);
    }
    if (value) {
      value.className = 'product-reviews-summary-value';
      summary.append(value);
    }
    fragment.append(summary);
  }

  if (reviewRows.length) {
    const ul = document.createElement('ul');
    ul.className = 'product-reviews-list';
    reviewRows.forEach((row) => {
      const li = document.createElement('li');
      const [meta, body] = row.children;
      if (meta) {
        meta.className = 'product-reviews-meta';
        li.append(meta);
      }
      if (body) {
        body.className = 'product-reviews-body';
        li.append(body);
      }
      ul.append(li);
    });
    fragment.append(ul);
  }

  block.replaceChildren(fragment);
}

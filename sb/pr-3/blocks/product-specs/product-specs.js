import { hydrate } from '../../scripts/product-data.js';
import renderProductSpecs from '../../scripts/renderers/product-specs.js';

export default async function decorate(block) {
  const hasContent = await hydrate(block, renderProductSpecs);
  if (!hasContent) return;

  const dl = document.createElement('dl');
  [...block.children].forEach((row) => {
    const [label, value] = row.children;
    if (!label || !value) return;
    const dt = document.createElement('dt');
    dt.textContent = label.textContent.trim();
    const dd = document.createElement('dd');
    dd.textContent = value.textContent.trim();
    dl.append(dt, dd);
  });

  block.replaceChildren(dl);
}

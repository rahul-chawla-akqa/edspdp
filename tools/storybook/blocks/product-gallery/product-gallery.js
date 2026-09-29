import { createOptimizedPicture } from '../../scripts/aem.js';
import { hydrate } from '../../scripts/product-data.js';
import renderProductGallery from '../../scripts/renderers/product-gallery.js';

/*
 * On a composed page the gallery images have been ingested into the AEM media bus and are
 * same-origin, so the EDS optimization parameters apply. On a client-hydrated page they still
 * point at the third-party CDN, which ignores those parameters -- and advertising
 * type="image/webp" for an arbitrary remote file would be inaccurate -- so those stay plain.
 */
function pictureFor(src, alt, eager) {
  let sameOrigin = false;
  try {
    sameOrigin = new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    sameOrigin = false;
  }

  if (sameOrigin) return createOptimizedPicture(src, alt, eager, [{ width: '750' }]);

  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.setAttribute('loading', eager ? 'eager' : 'lazy');
  picture.append(img);
  return picture;
}

export default async function decorate(block) {
  const hasContent = await hydrate(block, renderProductGallery);
  if (!hasContent) return;

  const sources = [...block.querySelectorAll('img')]
    .map((img) => ({ src: img.src, alt: img.alt }))
    .filter(({ src }) => src);

  if (!sources.length) {
    block.replaceChildren();
    return;
  }

  const stage = document.createElement('div');
  stage.className = 'product-gallery-stage';
  stage.append(pictureFor(sources[0].src, sources[0].alt, true));
  block.replaceChildren(stage);

  if (sources.length === 1) return;

  const thumbs = document.createElement('ul');
  thumbs.className = 'product-gallery-thumbs';

  const buttons = sources.map(({ src, alt }, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show image ${index + 1} of ${sources.length}`);
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    button.append(pictureFor(src, alt, false));
    item.append(button);
    thumbs.append(item);
    return button;
  });

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      stage.replaceChildren(pictureFor(sources[index].src, sources[index].alt, true));
      buttons.forEach((other, otherIndex) => {
        other.setAttribute('aria-pressed', otherIndex === index ? 'true' : 'false');
      });
    });
  });

  block.append(thumbs);
}

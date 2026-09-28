import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { applySectionBackground, renderFooterContent } from './footer-layout.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  const sourceBlock = fragment.querySelector('.footer.block');
  const section = sourceBlock?.closest('.section') || fragment.querySelector('.section');

  block.textContent = '';
  const shell = document.createElement('div');
  shell.className = 'footer-shell';
  applySectionBackground(section, shell);

  if (sourceBlock) {
    renderFooterContent(shell, sourceBlock, moveInstrumentation);
  } else {
    while (fragment.firstElementChild) shell.append(fragment.firstElementChild);
  }

  block.append(shell);
}

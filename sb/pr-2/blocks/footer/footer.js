import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { applySectionBackground, renderFooter, rowType } from './footer-layout.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // The block is authored on the footer page itself, so decorate it in place and keep the
  // authoring instrumentation. On every other page loadFooter() injects an empty footer
  // block, which is filled from the authored footer page instead.
  const authored = [...block.children].some((row) => rowType(row));
  if (authored) {
    const shell = renderFooter(block, moveInstrumentation);
    applySectionBackground(block.closest('.section'), shell);
    return;
  }

  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  // loadFragment() already decorated the authored footer block on that page
  const shell = fragment.querySelector('.footer-shell');
  if (shell) {
    block.replaceChildren(shell);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'footer-shell';
  while (fragment.firstElementChild) wrapper.append(fragment.firstElementChild);
  block.replaceChildren(wrapper);
}

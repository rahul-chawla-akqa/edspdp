import { loadCSS } from '../scripts/aem.js';

/**
 * Wrap authored block HTML in the EDS page shell and run the block decorator.
 * @param {object} options
 * @param {string} options.name Block folder / class name
 * @param {string} [options.html] Pre-decoration inner HTML
 * @param {string[]} [options.classes] Extra classes on the block (variants)
 * @param {Function} [options.decorate] Block decorate()
 * @param {'main'|'header'|'footer'} [options.landmark]
 * @returns {Promise<HTMLElement>}
 */
export async function renderBlock({
  name,
  html = '',
  classes = [],
  decorate,
  landmark = 'main',
}) {
  const block = document.createElement('div');
  block.className = [name, 'block', ...classes].filter(Boolean).join(' ');
  block.dataset.blockName = name;
  block.dataset.blockStatus = 'initialized';
  block.innerHTML = html;

  const wrapper = document.createElement('div');
  wrapper.className = `${name}-wrapper`;
  wrapper.append(block);

  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.sectionStatus = 'loaded';
  section.append(wrapper);

  const root = document.createElement(landmark === 'main' ? 'main' : landmark);
  if (landmark === 'main') {
    root.append(section);
  } else {
    root.append(wrapper);
  }

  try {
    await loadCSS(`/blocks/${name}/${name}.css`);
  } catch {
    // Some blocks ship empty CSS; stories still decorate.
  }

  if (typeof decorate === 'function') {
    await decorate(block);
  }
  block.dataset.blockStatus = 'loaded';
  return root;
}

/**
 * Default content (buttons, text) inside a section, then run a decorate helper.
 * @param {string} html
 * @param {Function} [decorate]
 * @returns {Promise<HTMLElement>}
 */
export async function renderSection(html, decorate) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.sectionStatus = 'loaded';
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  wrapper.innerHTML = html;
  section.append(wrapper);
  main.append(section);
  if (typeof decorate === 'function') {
    await decorate(main);
  }
  return main;
}

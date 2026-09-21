import { renderBlock } from '../decorate.js';
import { row } from '../markup.js';
import { blockStory } from './_shared.js';

export default {
  title: 'Blocks/Feature Flags',
};

export const Docs = {
  name: 'Docs',
  ...blockStory(async () => {
    const root = await renderBlock({
      name: 'feature-flags',
      html: row('true'),
    });
    const note = document.createElement('div');
    note.style.padding = '1.5rem';
    note.innerHTML = `
      <h2>Feature flags</h2>
      <p>This is not a visitor-facing UI block. Authors toggle values on a config page;
      the SSR composer reads them when composing product pages. There is no
      <code>decorate()</code> function. The illustration below is authored markup only.</p>
    `;
    root.prepend(note);
    return root;
  }),
};

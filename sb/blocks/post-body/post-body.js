import { hydrate } from '../../scripts/post-data.js';
import renderPostBody from '../../scripts/renderers/post-body.js';

export default async function decorate(block) {
  const hasContent = await hydrate(block, renderPostBody);
  if (!hasContent) return;

  const [titleRow, bodyRow] = [...block.children];
  const article = document.createElement('article');

  const heading = document.createElement('h2');
  heading.textContent = titleRow ? titleRow.textContent.trim() : '';
  article.append(heading);

  if (bodyRow) {
    const paragraphs = [...bodyRow.querySelectorAll('p')];
    if (paragraphs.length) {
      paragraphs.forEach((node) => article.append(node));
    } else {
      const text = bodyRow.textContent.trim();
      if (text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        article.append(paragraph);
      }
    }
  }

  block.replaceChildren(article);
}

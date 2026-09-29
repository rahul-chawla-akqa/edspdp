import { paragraph, row } from './html.js';

/**
 * Pre-decoration rows for the post-body placeholder: title, then body.
 * Newlines in the API body become separate paragraphs inside the second cell.
 */
export default function renderPostBody(data) {
  if (!data) return '';
  const title = data.title != null ? String(data.title).trim() : '';
  const body = data.body != null ? String(data.body).trim() : '';
  if (!title && !body) return '';

  const rows = [];
  if (title) rows.push(row(paragraph(title)));
  if (body) {
    const bodyHtml = body.split(/\n+/).map((part) => paragraph(part)).join('');
    rows.push(row(bodyHtml));
  }
  return rows.join('');
}

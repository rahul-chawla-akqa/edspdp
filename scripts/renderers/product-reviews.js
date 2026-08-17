import { escapeHtml, paragraph, row } from './html.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/*
 * Formatted from a fixed month table rather than Intl, so the server-composed page and
 * client-hydrated page produce byte-identical output regardless of runtime locale.
 */
function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function stars(rating) {
  if (rating === undefined || rating === null) return '';
  return `${Math.round(rating * 10) / 10} out of 5`;
}

/*
 * Row contract: the first row is the aggregate summary, every following row is one review
 * as [reviewer meta, review body]. product-reviews.js relies on that ordering.
 */
export default function renderProductReviews(data) {
  if (!data) return '';
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  const count = reviews.length;
  const summary = row(
    'Overall rating',
    [
      paragraph(stars(data.rating)),
      paragraph(count === 1 ? '1 review' : `${count} reviews`),
    ].join(''),
  );

  const entries = reviews.map((review) => row(
    [
      paragraph(review.reviewerName),
      paragraph(stars(review.rating)),
      paragraph(formatDate(review.date)),
    ].join(''),
    review.comment ? `<blockquote>${escapeHtml(review.comment)}</blockquote>` : '',
  ));

  return [summary, ...entries].join('');
}

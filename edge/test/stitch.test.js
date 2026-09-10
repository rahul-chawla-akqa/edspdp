import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockOverrideId,
  cacheHeaders,
  fillPostBlock,
  parsePostId,
  renderRows,
  RENDERED_CLASS,
} from '../src/stitch.js';

const shell = (inner) => `<!DOCTYPE html>
<html><body><main>
  <div class="post-body">${inner}</div>
</main></body></html>`;

test('parsePostId reads /posts/post-N', () => {
  assert.equal(parsePostId('/posts/post-1'), '1');
  assert.equal(parsePostId('/posts/post-12.html'), '12');
  assert.equal(parsePostId('/posts/post-1/'), '1');
  assert.equal(parsePostId('/posts'), null);
  assert.equal(parsePostId('/products/1'), null);
});

test('blockOverrideId reads a numeric placeholder cell', () => {
  assert.equal(blockOverrideId(shell('<div><div>9</div></div>')), '9');
  assert.equal(blockOverrideId(shell('<div><div></div></div>')), null);
});

test('fillPostBlock injects rows and api-rendered', () => {
  const rows = renderRows({ title: 'Hello', body: 'Line one\nLine two' });
  const out = fillPostBlock(shell('<div><div></div></div>'), rows);
  assert.match(out, new RegExp(`class="post-body ${RENDERED_CLASS}"`));
  assert.match(out, /<p>Hello<\/p>/);
  assert.match(out, /<p>Line one<\/p>/);
  assert.match(out, /<p>Line two<\/p>/);
  assert.doesNotMatch(out, /class="post-body">\s*<div>/);
});

test('fillPostBlock returns null when the placeholder is missing', () => {
  assert.equal(fillPostBlock('<html><body><p>none</p></body></html>', '<div></div>'), null);
});

test('cacheHeaders tag CDN surrogate keys per post', () => {
  const headers = cacheHeaders('3');
  assert.equal(headers['surrogate-key'], 'posts post-3');
  assert.match(headers['surrogate-control'], /max-age=3600/);
});

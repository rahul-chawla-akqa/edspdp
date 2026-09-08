import test from 'node:test';
import assert from 'node:assert/strict';

import { unwrapProductJson, wrapProductJson } from '../../scripts/product-json.js';
import { product } from './fixtures.js';

test('wrapProductJson stores the product as a single sheet row', () => {
  const sheet = wrapProductJson(product);
  assert.equal(sheet[':type'], 'sheet');
  assert.equal(sheet.data[0].id, '1');
  assert.deepEqual(JSON.parse(sheet.data[0].payload), product);
});

test('unwrapProductJson restores a dummyjson object from a sheet', () => {
  assert.deepEqual(unwrapProductJson(wrapProductJson(product)), product);
});

test('unwrapProductJson passes through a dummyjson object', () => {
  assert.deepEqual(unwrapProductJson(product), product);
});

test('unwrapProductJson returns null for empty input', () => {
  assert.equal(unwrapProductJson(null), null);
  assert.equal(wrapProductJson(null), null);
});

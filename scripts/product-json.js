/*
 * EDS stores spreadsheet-shaped JSON on the content bus. DummyJSON products are nested
 * objects, so they are wrapped as a single-row sheet (payload cell) for ingest and unwrapped
 * before renderers or block hydration run.
 */

export function wrapProductJson(product) {
  if (!product || typeof product !== 'object') return null;
  const id = product.id == null ? '' : String(product.id);
  if (!id) return null;
  return {
    total: 1,
    offset: 0,
    limit: 1,
    columns: ['id', 'payload'],
    data: [{ id, payload: JSON.stringify(product) }],
    ':type': 'sheet',
  };
}

export function unwrapProductJson(json) {
  if (!json || typeof json !== 'object') return null;
  const row = Array.isArray(json.data) ? json.data[0] : null;
  if (row && row.payload != null) {
    if (typeof row.payload === 'object') return row.payload;
    if (typeof row.payload === 'string') {
      try {
        const parsed = JSON.parse(row.payload);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
  }
  if (json.id != null && json.title) return json;
  return null;
}

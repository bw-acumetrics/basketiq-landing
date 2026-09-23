import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCategoryList, assertCategoryListComplete } from './pulse';

function stubFetch(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('categories tripwire', () => {
  it('rejects a truncated list', async () => {
    stubFetch({ items: [{ slug: 'a', display_label: 'A', receipt_count: 1, median_price: '1.00' }], truncated: true });
    const list = await fetchCategoryList();
    expect(() => assertCategoryListComplete(list)).toThrow(/truncated=true/);
  });

  it('rejects an empty list', async () => {
    stubFetch({ items: [], truncated: false });
    const list = await fetchCategoryList();
    expect(() => assertCategoryListComplete(list)).toThrow(/count=0/);
  });

  it('accepts a complete list', async () => {
    const items = Array.from({ length: 52 }, (_, i) => ({
      slug: `c-${i}`,
      display_label: `C ${i}`,
      receipt_count: 30,
      median_price: '10.00',
    }));
    stubFetch({ items, truncated: false });
    const list = await fetchCategoryList();
    expect(list.items).toHaveLength(52);
    expect(list.truncated).toBe(false);
    expect(() => assertCategoryListComplete(list)).not.toThrow();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchCategoryList,
  assertCategoryListComplete,
  normalizeSnapshot,
  refreshLiveFields,
} from './pulse';

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

// Mirrors the markup [slug].astro bakes on a published page: price fields present,
// #limited-state collapsed, fallback article emitted but hidden.
function bakePublishedPage(): void {
  document.body.innerHTML = `
    <main id="pulse-category" data-slug="amb_rice-mass-10000">
      <div id="snapshot-content">
        <span data-pulse-field="median_price">P 125.99</span>
        <span data-pulse-field="p10_price">P 99.00</span>
        <span data-pulse-field="p90_price">P 150.00</span>
        <span data-pulse-field="receipt_count">30</span>
      </div>
      <div id="verdict-container" class="hidden"></div>
      <div id="limited-state" class="hidden space-y-8">
        <article>
          <p>We have <span data-pulse-limited="receipt_count">30</span> receipts, we publish at <span data-pulse-limited="receipts_required">30</span>.</p>
          <div role="progressbar" aria-valuenow="100">
            <div data-pulse-limited="progress" style="width: 100%"></div>
          </div>
        </article>
        <article data-pulse-limited="fallback" class="hidden card">
          <h3>Nearby category: <span data-pulse-limited="fallback_label"></span></h3>
          <span data-pulse-limited="fallback_price"></span>
          <span data-pulse-limited="fallback_count"></span>
          <a data-pulse-limited="fallback_href" href="/pulse">View full snapshot</a>
        </article>
      </div>
    </main>`;
}

const SMALL_N = {
  slug: 'amb_rice-mass-10000',
  display_label: 'Rice 10kg',
  published: false,
  receipt_count: 14,
  receipts_required: 30,
  fallback: { slug: 'amb_rice-leaf-mass', display_label: 'Rice (per kg)', median_price: '13.00', receipt_count: 35 },
};

describe('refreshLiveFields on an unpublished payload', () => {
  it('shows the limited state instead of writing zeros', () => {
    bakePublishedPage();
    refreshLiveFields(normalizeSnapshot(SMALL_N));

    const texts = [...document.querySelectorAll('*')].map((el) => el.textContent ?? '');
    expect(texts.some((t) => /P 0\.00/.test(t))).toBe(false);
    expect(document.getElementById('snapshot-content')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('limited-state')!.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('[data-pulse-limited="receipt_count"]')!.textContent).toBe('14');
    expect(document.querySelector('[data-pulse-limited="fallback_href"]')!.getAttribute('href')).toBe(
      '/pulse/amb_rice-leaf-mass',
    );
    expect(document.querySelector('[data-pulse-limited="fallback"]')!.classList.contains('hidden')).toBe(false);
  });

  it('keeps the fallback article hidden when fallback is null', () => {
    bakePublishedPage();
    expect(() => refreshLiveFields(normalizeSnapshot({ ...SMALL_N, fallback: null }))).not.toThrow();
    expect(document.querySelector('[data-pulse-limited="fallback"]')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('limited-state')!.classList.contains('hidden')).toBe(false);
  });

  it('renders a scripted fallback label as text, not markup', () => {
    bakePublishedPage();
    refreshLiveFields(
      normalizeSnapshot({
        ...SMALL_N,
        fallback: { ...SMALL_N.fallback, display_label: '<script>alert(1)</script>' },
      }),
    );
    const label = document.querySelector('[data-pulse-limited="fallback_label"]')!;
    expect(label.querySelector('script')).toBeNull();
    expect(label.textContent).toBe('<script>alert(1)</script>');
  });
});

describe('refreshLiveFields on a published payload', () => {
  it('writes prices as before and leaves the limited state collapsed', () => {
    bakePublishedPage();
    refreshLiveFields(
      normalizeSnapshot({
        slug: 'amb_maize-leaf-mass',
        display_label: 'Maize meal',
        published: true,
        median_price: '22.50',
        avg_price: '23.10',
        p10_price: '18.00',
        p90_price: '29.00',
        receipt_count: 412,
        pct_change_fraction: '0.018',
      }),
    );

    expect(document.querySelector('[data-pulse-field="median_price"]')!.textContent).toBe('P 22.50');
    expect(document.querySelector('[data-pulse-field="p10_price"]')!.textContent).toBe('P 18.00');
    expect(document.querySelector('[data-pulse-field="p90_price"]')!.textContent).toBe('P 29.00');
    expect(document.getElementById('limited-state')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('snapshot-content')!.classList.contains('hidden')).toBe(false);
  });
});

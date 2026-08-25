// Market Pulse — typed API client, formatters, and D1c mount-refresh.
// API_BASE matches the existing /l/ page (src/pages/l/index.astro:5).
export const API_BASE = 'https://api.basketiq.co.bw';

// ---- types (raw API returns strings for prices — normalized in fetch) ----

export interface CategoryListItem {
  slug: string;
  display_label: string;
  receipt_count: number;
  median_price: number; // normalized from string
}

export interface TrendPoint {
  value: number | null; // normalized from string|null
}

export interface StoreShare {
  store_rollup: string; // supermarkets | wholesalers | convenience_other
  share_pct: number; // normalized from string
}

export interface TeaserFields {
  avg_trip_spend: number | null; // normalized from string|null
  trip_basket_count: number | null;
  bought_together_count: number | null;
  co_basket_brand_count: number | null;
  competing_brand_count: number | null;
}

/** Full snapshot or small-n — discriminated on `published`. */
export interface CategorySnapshot {
  slug: string;
  display_label: string;
  median_price: number;
  avg_price: number;
  p10_price: number;
  p90_price: number;
  receipt_count: number;
  pct_change_fraction: number | null; // normalized from string|null
  delta_fraction: number | null;
  trend: TrendPoint[];
  store_shares: StoreShare[];
  teaser: TeaserFields;
  published: boolean;
  // small-n only
  receipts_required?: number;
  fallback?: {
    slug: string;
    display_label: string;
    median_price: number;
    receipt_count: number;
  } | null;
}

export interface PublicMetrics {
  verified_receipts: number;
}

export interface PriceCheckResponse {
  position_pct: number;
  direction: string;
  delta_fraction: number;
  median_price: number;
}

// ---- normalizers ----

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  return 0;
}

function toNullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n; }
  if (typeof v === 'number') return isNaN(v) ? null : v;
  return null;
}

function normalizeItem(raw: Record<string, unknown>): CategoryListItem {
  return {
    slug: String(raw.slug ?? ''),
    display_label: String(raw.display_label ?? ''),
    receipt_count: toNum(raw.receipt_count),
    median_price: toNum(raw.median_price),
  };
}

function normalizeSnapshot(raw: Record<string, unknown>): CategorySnapshot {
  const trend: TrendPoint[] = Array.isArray(raw.trend)
    ? raw.trend.map((p: Record<string, unknown>) => ({ value: toNullableNum(p.value) }))
    : [];

  const storeShares: StoreShare[] = Array.isArray(raw.store_shares)
    ? raw.store_shares.map((s: Record<string, unknown>) => ({
        store_rollup: String(s.store_rollup ?? ''),
        share_pct: toNum(s.share_pct),
      }))
    : [];

  const teaserRaw = (raw.teaser || {}) as Record<string, unknown>;
  const teaser: TeaserFields = {
    avg_trip_spend: toNullableNum(teaserRaw.avg_trip_spend),
    trip_basket_count: toNullableNum(teaserRaw.trip_basket_count),
    bought_together_count: toNullableNum(teaserRaw.bought_together_count),
    co_basket_brand_count: toNullableNum(teaserRaw.co_basket_brand_count),
    competing_brand_count: toNullableNum(teaserRaw.competing_brand_count),
  };

  const fallbackRaw = raw.fallback as Record<string, unknown> | null | undefined;
  const fallback = fallbackRaw
    ? {
        slug: String(fallbackRaw.slug ?? ''),
        display_label: String(fallbackRaw.display_label ?? ''),
        median_price: toNum(fallbackRaw.median_price),
        receipt_count: toNum(fallbackRaw.receipt_count),
      }
    : null;

  return {
    slug: String(raw.slug ?? ''),
    display_label: String(raw.display_label ?? ''),
    median_price: toNum(raw.median_price),
    avg_price: toNum(raw.avg_price),
    p10_price: toNum(raw.p10_price),
    p90_price: toNum(raw.p90_price),
    receipt_count: toNum(raw.receipt_count),
    pct_change_fraction: toNullableNum(raw.pct_change_fraction),
    delta_fraction: toNullableNum(raw.delta_fraction),
    trend,
    store_shares: storeShares,
    teaser,
    published: Boolean(raw.published),
    receipts_required: typeof raw.receipts_required === 'number' ? raw.receipts_required : undefined,
    fallback,
  };
}

// ---- formatters ----

export function formatPula(value: number, decimals: number = 2): string {
  return `P ${value.toFixed(decimals)}`;
}

/**
 * The one and only place the ×100 conversion happens.
 * fraction 0.0185 → "+1.9%"; null → "no trend"; −0.023 → "−2.3%".
 */
export function formatPctChange(fraction: number | null): string {
  if (fraction === null) return 'no trend';
  const pct = fraction * 100;
  const sign = pct >= 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

/** Opaque client UUID persisted in sessionStorage; falls back to per-page value. */
export function getSessionHash(): string {
  try {
    const existing = sessionStorage.getItem('mp_session_hash');
    if (existing) return existing;
    const hash = crypto.randomUUID();
    sessionStorage.setItem('mp_session_hash', hash);
    return hash;
  } catch {
    return crypto.randomUUID();
  }
}

// ---- GET helpers ----

export async function fetchCategories(): Promise<CategoryListItem[]> {
  const res = await fetch(`${API_BASE}/v1/public/pulse/categories`);
  if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
  const raw = await res.json();
  // API wraps with { items: [...] }
  const items: unknown[] = raw.items ?? raw;
  return items.map((i) => normalizeItem(i as Record<string, unknown>));
}

export async function fetchSnapshot(slug: string): Promise<CategorySnapshot> {
  const res = await fetch(`${API_BASE}/v1/public/pulse/categories/${slug}`);
  if (!res.ok) throw new Error(`Snapshot fetch failed for ${slug}: ${res.status}`);
  const raw = await res.json();
  return normalizeSnapshot(raw);
}

export async function fetchPublicMetrics(): Promise<PublicMetrics> {
  const res = await fetch(`${API_BASE}/api/metrics/public`);
  if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`);
  return res.json();
}

// ---- POST helpers ----

/** Fire-and-forget lookup beacon. Failure is swallowed — this is best-effort by design. */
export async function postLookup(slug: string, referrer: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/v1/public/pulse/lookups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, referrer, session_hash: getSessionHash(), website: '' }),
    });
  } catch {
    // best-effort beacon — intentionally silent
  }
}

export async function postContact(
  insightType: string,
  contactDetail: string,
  categorySlug: string,
  desiredLookbackDays?: number,
): Promise<{ ok: boolean; status: number }> {
  const body: Record<string, unknown> = {
    insight_type: insightType,
    contact_detail: contactDetail.trim().substring(0, 200),
    category_slug: categorySlug,
    session_hash: getSessionHash(),
    website: '',
  };
  if (desiredLookbackDays !== undefined) {
    body.desired_lookback_days = desiredLookbackDays;
  }
  const res = await fetch(`${API_BASE}/v1/public/pulse/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status };
}

export async function postPriceCheck(slug: string, enteredPrice: number): Promise<PriceCheckResponse> {
  const res = await fetch(`${API_BASE}/v1/public/pulse/categories/${slug}/price-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entered_price: enteredPrice, session_hash: getSessionHash(), website: '' }),
  });
  if (!res.ok) throw new Error(`Price check failed: ${res.status}`);
  return res.json();
}

export async function postNotifyMe(slug: string, phoneNumber: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${API_BASE}/v1/public/pulse/notify-me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, phone_number: phoneNumber, session_hash: getSessionHash(), website: '' }),
  });
  return { ok: res.ok, status: res.status };
}

/** Compose a branded WhatsApp share URL from verdict text + receipt count + category URL. */
export function whatsappShareUrl(verdictText: string, receiptCount: number, categoryUrl: string): string {
  const text = `${verdictText}\nBased on ${receiptCount} till-verified receipts\n\nSee more: ${categoryUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// ---- D1c mount-refresh ----

/** Overwrite every [data-pulse-field] element on the page with live snapshot values. */
export function refreshLiveFields(data: CategorySnapshot): void {
  const fieldMap: Record<string, string> = {
    median_price: formatPula(data.median_price),
    avg_price: formatPula(data.avg_price),
    p10_price: formatPula(data.p10_price),
    p90_price: formatPula(data.p90_price),
    receipt_count: String(data.receipt_count),
    pct_change_fraction: formatPctChange(data.pct_change_fraction),
  };

  document.querySelectorAll('[data-pulse-field]').forEach((el) => {
    const field = el.getAttribute('data-pulse-field');
    if (field && fieldMap[field] !== undefined) {
      el.textContent = fieldMap[field];
    }
  });
}
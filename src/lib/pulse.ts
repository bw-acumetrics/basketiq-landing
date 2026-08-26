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
  direction: 'above' | 'below' | 'at';
  delta_fraction: number | null; // normalized from string|null
  median_price: number | null;
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

export function normalizeSnapshot(raw: Record<string, unknown>): CategorySnapshot {
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

/** `direction` is a three-way literal — `at` is an exact-median hit, not "below". */
export function formatDirection(direction: string): string {
  if (direction === 'above') return 'ABOVE';
  if (direction === 'below') return 'BELOW';
  return 'AT';
}

/** Escape untrusted text before it goes anywhere near innerHTML. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SparklineGeometry {
  segments: string[];
  gaps: { cx: string; cy: string }[];
}

/**
 * Sparkline path geometry — shared by the baked <Sparkline/> and the D1c refresh
 * so the redrawn line is identical to the one it replaces. Nulls break the
 * polyline and keep their x-slot (the x-axis never collapses).
 */
export function buildSparkline(trend: TrendPoint[], height: number = 48): SparklineGeometry {
  const w = trend.length > 1 ? trend.length - 1 : 1;
  const values = trend.map((p) => p.value).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const range = max - min || 1;
  const pad = 4;
  const toX = (i: number) => pad + (i / w) * (200 - 2 * pad);
  const toY = (v: number) => pad + (1 - (v - min) / range) * (height - 2 * pad);

  const segments: string[] = [];
  const gaps: { cx: string; cy: string }[] = [];
  let current: string[] = [];
  for (let i = 0; i < trend.length; i++) {
    const value = trend[i].value;
    if (value !== null) {
      current.push(`${current.length === 0 ? 'M' : 'L'}${toX(i).toFixed(1)} ${toY(value).toFixed(1)}`);
    } else {
      gaps.push({ cx: toX(i).toFixed(1), cy: (height / 2).toFixed(1) });
      if (current.length > 0) {
        segments.push(current.join(' '));
        current = [];
      }
    }
  }
  if (current.length > 0) segments.push(current.join(' '));
  return { segments, gaps };
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
  honeypot: string = '',
): Promise<{ ok: boolean; status: number }> {
  const body: Record<string, unknown> = {
    insight_type: insightType,
    contact_detail: contactDetail.trim().substring(0, 200),
    // ContactRequest names this `slug` (api/pulse_routes.py) — `category_slug` 422s.
    slug: categorySlug,
    session_hash: getSessionHash(),
    website: honeypot,
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

export async function postPriceCheck(
  slug: string,
  enteredPrice: number,
  honeypot: string = '',
): Promise<PriceCheckResponse> {
  const res = await fetch(`${API_BASE}/v1/public/pulse/categories/${slug}/price-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entered_price: enteredPrice, session_hash: getSessionHash(), website: honeypot }),
  });
  if (!res.ok) throw new Error(`Price check failed: ${res.status}`);
  const raw = await res.json();
  // Prices and fractions come back as JSON strings — normalize before any arithmetic.
  return {
    position_pct: toNum(raw.position_pct),
    direction: raw.direction,
    delta_fraction: toNullableNum(raw.delta_fraction),
    median_price: toNullableNum(raw.median_price),
  };
}

export async function postNotifyMe(
  slug: string,
  phoneNumber: string,
  honeypot: string = '',
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${API_BASE}/v1/public/pulse/notify-me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, phone_number: phoneNumber, session_hash: getSessionHash(), website: honeypot }),
  });
  return { ok: res.ok, status: res.status };
}

/** Compose a branded WhatsApp share URL from verdict text + receipt count + category URL. */
export function whatsappShareUrl(verdictText: string, receiptCount: number | string, categoryUrl: string): string {
  const text = `${verdictText}\nBased on ${receiptCount} till-verified receipts\n\nSee more: ${categoryUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// ---- D1c mount-refresh ----

/**
 * Overwrite every live field on the page with fresh snapshot values.
 * D1 names: price panel (median/avg/p10/p90), receipt_count, pct_change_fraction,
 * sparkline, store shares and teaser counts. Labels, slugs and OG tags stay baked.
 * A null incoming value leaves the baked value in place rather than blanking it.
 */
export function refreshLiveFields(data: CategorySnapshot): void {
  const fieldMap: Record<string, string> = {
    median_price: formatPula(data.median_price),
    avg_price: formatPula(data.avg_price),
    p10_price: formatPula(data.p10_price),
    p90_price: formatPula(data.p90_price),
    receipt_count: data.receipt_count.toLocaleString(),
    pct_change_fraction: formatPctChange(data.pct_change_fraction),
  };

  document.querySelectorAll('[data-pulse-field]').forEach((el) => {
    const field = el.getAttribute('data-pulse-field');
    if (field && fieldMap[field] !== undefined) {
      el.textContent = fieldMap[field];
    }
  });

  // Median marker on the P10–P90 range bar moves with the refreshed prices.
  const markerRange = data.p90_price - data.p10_price || 1;
  document.querySelectorAll('[data-pulse-range-marker]').forEach((el) => {
    (el as HTMLElement).style.left = `${((data.median_price - data.p10_price) / markerRange) * 100}%`;
  });

  // Store shares — percentage label and bar width per rollup.
  data.store_shares.forEach((share) => {
    const row = document.querySelector(`[data-pulse-share="${share.store_rollup}"]`);
    if (!row) return;
    const pctEl = row.querySelector('[data-pulse-share-pct]');
    if (pctEl) pctEl.textContent = `${Math.round(share.share_pct)}%`;
    const barEl = row.querySelector('[data-pulse-share-bar]');
    if (barEl) (barEl as HTMLElement).style.width = `${share.share_pct}%`;
  });

  // Teaser counts. A field that has gone null keeps its baked value — the baked
  // row is valid, just older, and blanking it would render an empty sentence.
  const teaserMap: Record<string, string | null> = {
    avg_trip_spend: data.teaser.avg_trip_spend === null ? null : formatPula(data.teaser.avg_trip_spend),
    trip_basket_count: data.teaser.trip_basket_count === null ? null : String(data.teaser.trip_basket_count),
    bought_together_count: data.teaser.bought_together_count === null ? null : String(data.teaser.bought_together_count),
    co_basket_brand_count: data.teaser.co_basket_brand_count === null ? null : String(data.teaser.co_basket_brand_count),
    competing_brand_count: data.teaser.competing_brand_count === null ? null : String(data.teaser.competing_brand_count),
  };
  document.querySelectorAll('[data-pulse-teaser]').forEach((el) => {
    const field = el.getAttribute('data-pulse-teaser');
    const value = field ? teaserMap[field] : undefined;
    if (value) el.textContent = value;
  });

  // Sparkline — redraw from the shared geometry builder.
  const svg = document.querySelector('[data-pulse-sparkline]');
  if (svg && data.trend.length > 0) {
    const { segments, gaps } = buildSparkline(data.trend);
    svg.innerHTML =
      segments
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="#00a17a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join('') +
      gaps
        .map((g) => `<circle cx="${g.cx}" cy="${g.cy}" r="1.5" fill="none" stroke="#c1c7cb" stroke-width="1"/>`)
        .join('');
  }
}

/** Trust-strip verified_receipts is live too (D4c) — refreshed on the /pulse home. */
export async function refreshPublicMetrics(): Promise<void> {
  try {
    const metrics = await fetchPublicMetrics();
    document.querySelectorAll('[data-pulse-field="verified_receipts"]').forEach((el) => {
      el.textContent = metrics.verified_receipts.toLocaleString();
    });
  } catch {
    // Refresh failure leaves the baked count in place silently.
  }
}

/**
 * BasketIQ Chain Snapshot — consumer preference renderer.
 * Shows behavioral signals only. No raw spend, no brand data.
 */
const API_BASE = 'https://api.basketiq.co.bw/api/metrics/snapshots';

const CHAIN_META = {
  choppies: { color: '#e31e24', tagline: "Botswana's largest supermarket chain — what do their shoppers prefer?" },
  spar:     { color: '#d4212c', tagline: 'International franchise in Gaborone — shopper preference profile' },
  shoprite: { color: '#0033a0', tagline: 'South African value chain — consumer behavior snapshot' },
};

const CATEGORY_LABELS = {
  FRH_MILK: 'Fresh Milk & Dairy', BEV_SOFT_DRINKS: 'Soft Drinks', AMB_SUGAR: 'Sugar & Sweeteners',
  AMB_PASTA: 'Pasta & Noodles', HH_LAUNDRY: 'Laundry & Cleaning', AMB_CONDIMENTS: 'Condiments & Sauces',
  AMB_FLOUR: 'Flour & Baking', BEV_POWDERED: 'Powdered Beverages', AMB_OIL: 'Cooking Oil',
  PC_SOAP: 'Soap & Body Care', BEV_JUICES: 'Juices', AMB_BREAD: 'Bread & Bakery',
  AMB_CHIPS: 'Chips & Snacks', AMB_SWEETS: 'Sweets & Candy', FRZ_CHICKEN: 'Frozen Chicken',
  FRH_YOGHURT: 'Yoghurt', AMB_CEREALS: 'Cereals & Porridge', BEV_CORDIALS: 'Cordials & Squash',
  AMB_RICE: 'Rice & Grains', AMB_BAKING: 'Baking Supplies', AMB_BISCUITS: 'Biscuits & Cookies',
  AMB_SPICES: 'Spices & Seasoning', PC_HAIR: 'Hair Care', HH_TISSUE: 'Tissue & Paper Products',
  BB_DIAPERS: 'Baby & Diapers', AMB_GRAINS: 'Grains & Samp', AMB_MAIZE: 'Maize Meal',
  FRH_COLD_MEATS: 'Cold Meats & Deli', BEV_WATER: 'Water',
};

function catLabel(code) {
  return CATEGORY_LABELS[code] || code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function indexColor(idx) {
  if (idx >= 130) return 'text-emerald-400';
  if (idx >= 110) return 'text-primary';
  if (idx <= 70) return 'text-red-400';
  if (idx <= 90) return 'text-amber-400';
  return 'text-on-surface-variant';
}

function indexLabel(idx) {
  if (idx >= 130) return 'Strong preference';
  if (idx >= 110) return 'Above average';
  if (idx <= 70) return 'Below average';
  if (idx <= 90) return 'Slight under-index';
  return 'Average';
}

function renderSnapshot(data) {
  const meta = CHAIN_META[data.chain.toLowerCase()] || { tagline: '' };

  document.querySelectorAll('[id="snap-chain-name"]').forEach(el => el.textContent = data.chain);
  document.getElementById('snap-tagline').textContent = meta.tagline;
  document.getElementById('snap-period').textContent = data.period;
  document.getElementById('snap-panel-size').textContent = data.panel_size.toLocaleString() + ' receipts';
  document.getElementById('snap-basket-band').textContent = data.avg_basket_band;
  document.getElementById('snap-avg-items').textContent = data.avg_items_per_basket.toFixed(1) + ' items';
  document.getElementById('snap-cat-count').textContent = data.category_count + ' categories tracked';

  // Category preferences
  const catContainer = document.getElementById('snap-categories');
  if (catContainer && data.top_categories.length) {
    catContainer.innerHTML = data.top_categories.map(c => {
      const idxClass = indexColor(c.preference_index);
      const idxText = indexLabel(c.preference_index);
      const barWidth = Math.min(c.basket_pct, 100);
      return `
        <div class="py-4 border-b border-outline-variant/10 last:border-0">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-bold text-white">${catLabel(c.category)}</span>
            <div class="flex items-center gap-4">
              <span class="text-sm font-bold text-primary">${c.basket_pct}%</span>
              <span class="text-xs font-bold ${idxClass} w-20 text-right" title="${idxText}">
                ${c.preference_index > 100 ? '+' : ''}${c.preference_index - 100}%
              </span>
            </div>
          </div>
          <div class="h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700"
                 style="width: ${barWidth}%"></div>
          </div>
          <div class="flex justify-between mt-1">
            <span class="text-[10px] text-on-surface-variant/40">% of baskets containing this category</span>
            <span class="text-[10px] ${idxClass}">${idxText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const ts = document.getElementById('snap-timestamp');
  if (ts) ts.textContent = new Date(data.timestamp).toLocaleString();

  document.getElementById('snap-loading').style.display = 'none';
  document.getElementById('snap-content').style.display = 'block';
}

async function loadSnapshot() {
  const chain = window.CHAIN_ID;
  if (!chain) return;
  try {
    const res = await fetch(`${API_BASE}/${chain}`);
    if (!res.ok) throw new Error('API error');
    renderSnapshot(await res.json());
  } catch (e) {
    console.warn('Snapshot API unavailable:', e);
    document.getElementById('snap-loading').innerHTML =
      '<p class="text-on-surface-variant">Snapshot data temporarily unavailable. <a href="/snapshots/" class="text-primary underline">Back to snapshots</a></p>';
  }
}

loadSnapshot();

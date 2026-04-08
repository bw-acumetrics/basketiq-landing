/**
 * BasketIQ Chain Snapshot — shared renderer.
 * Each chain page sets window.CHAIN_ID then loads this script.
 */
const API_BASE = 'https://api.basketiq.co.bw/api/metrics/snapshots';

const CHAIN_META = {
  choppies: { color: '#e31e24', letter: 'C', tagline: "Botswana's largest supermarket chain" },
  spar:     { color: '#d4212c', letter: 'S', tagline: 'International franchise, strong in Gaborone metro' },
  shoprite: { color: '#0033a0', letter: 'S', tagline: 'South African value chain' },
};

const CATEGORY_LABELS = {
  FRH_MILK: 'Fresh Milk', BEV_SOFT_DRINKS: 'Soft Drinks', AMB_SUGAR: 'Sugar',
  AMB_PASTA: 'Pasta & Noodles', HH_LAUNDRY: 'Laundry', AMB_CONDIMENTS: 'Condiments & Sauces',
  AMB_FLOUR: 'Flour', BEV_POWDERED: 'Powdered Beverages', AMB_OIL: 'Cooking Oil',
  PC_SOAP: 'Soap & Body Care', BEV_JUICES: 'Juices', AMB_BREAD: 'Bread',
  AMB_CHIPS: 'Chips & Snacks', AMB_SWEETS: 'Sweets & Candy', FRZ_CHICKEN: 'Frozen Chicken',
  FRH_YOGHURT: 'Yoghurt', AMB_CEREALS: 'Cereals & Porridge', BEV_CORDIALS: 'Cordials',
  AMB_RICE: 'Rice', AMB_BAKING: 'Baking', AMB_BISCUITS: 'Biscuits',
  AMB_SPICES: 'Spices', PC_HAIR: 'Hair Care', HH_TISSUE: 'Tissue & Paper',
  BB_DIAPERS: 'Baby & Diapers', HH_WRAPS: 'Wraps & Bags', AMB_GRAINS: 'Grains',
  FRH_COLD_MEATS: 'Cold Meats', BEV_WATER: 'Water', AMB_MAIZE: 'Maize Meal',
};

function catLabel(code) {
  return CATEGORY_LABELS[code] || code.replace(/_/g, ' ');
}

function fmt(n) { return n.toLocaleString('en-US'); }
function fmtP(n) { return 'P' + n.toFixed(2); }

function renderSnapshot(data) {
  const meta = CHAIN_META[data.chain.toLowerCase()] || { color: '#45dee7', letter: '?', tagline: '' };

  // Header metrics
  document.getElementById('snap-chain-name').textContent = data.chain;
  document.getElementById('snap-tagline').textContent = meta.tagline;
  document.getElementById('snap-period').textContent = data.period;
  document.getElementById('snap-receipts').textContent = fmt(data.receipts);
  document.getElementById('snap-line-items').textContent = fmt(data.line_items);
  document.getElementById('snap-total-spend').textContent = fmtP(data.total_spend_bwp);
  document.getElementById('snap-avg-basket').textContent = fmtP(data.avg_basket_bwp);
  document.getElementById('snap-avg-item').textContent = fmtP(data.avg_item_price_bwp);
  document.getElementById('snap-house-pct').textContent = data.house_brand_share_pct.toFixed(1) + '%';
  document.getElementById('snap-house-spend').textContent = fmtP(data.house_brand_spend_bwp);

  // House brand bar
  const houseBar = document.getElementById('snap-house-bar');
  if (houseBar) houseBar.style.width = Math.min(data.house_brand_share_pct, 100) + '%';

  // Categories
  const catContainer = document.getElementById('snap-categories');
  if (catContainer && data.top_categories.length) {
    const maxSpend = data.top_categories[0].spend_bwp;
    catContainer.innerHTML = data.top_categories.map(c => `
      <div class="flex items-center gap-4 group">
        <div class="w-36 md:w-48 text-sm text-on-surface-variant truncate">${catLabel(c.category)}</div>
        <div class="flex-1 h-6 bg-surface-container-highest rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700"
               style="width: ${(c.spend_bwp / maxSpend * 100).toFixed(1)}%"></div>
        </div>
        <div class="w-20 text-right text-sm font-bold text-white">${fmtP(c.spend_bwp)}</div>
        <div class="w-14 text-right text-xs text-on-surface-variant">${c.share_pct}%</div>
      </div>
    `).join('');
  }

  // Brands
  const brandContainer = document.getElementById('snap-brands');
  if (brandContainer && data.top_brands.length) {
    brandContainer.innerHTML = data.top_brands.map((b, i) => `
      <div class="flex items-center justify-between py-3 ${i < data.top_brands.length - 1 ? 'border-b border-outline-variant/10' : ''}">
        <div class="flex items-center gap-3">
          <span class="text-xs font-black text-on-surface-variant/40 w-5">${i + 1}</span>
          <span class="text-sm font-bold text-white">${b.brand}</span>
        </div>
        <div class="flex items-center gap-6">
          <span class="text-xs text-on-surface-variant">${b.items_sold} items</span>
          <span class="text-sm font-bold text-primary">${fmtP(b.spend_bwp)}</span>
        </div>
      </div>
    `).join('');
  }

  // Timestamp
  const ts = document.getElementById('snap-timestamp');
  if (ts) ts.textContent = new Date(data.timestamp).toLocaleString();

  // Show content
  document.getElementById('snap-loading').style.display = 'none';
  document.getElementById('snap-content').style.display = 'block';
}

async function loadSnapshot() {
  const chain = window.CHAIN_ID;
  if (!chain) return;

  try {
    const res = await fetch(`${API_BASE}/${chain}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    renderSnapshot(data);
  } catch (e) {
    console.warn('Snapshot API unavailable:', e);
    document.getElementById('snap-loading').innerHTML = `
      <p class="text-on-surface-variant">Snapshot data temporarily unavailable. <a href="/snapshots/" class="text-primary underline">Back to snapshots</a></p>
    `;
  }
}

loadSnapshot();

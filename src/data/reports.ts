export interface Report {
  slug: string;
  title: string;
  category: string;
  date: string;
  pages: number;
  icon: string;
  description: string;
  summary: string;
  insights: Array<{ icon: string; title: string; description: string }>;
  related: string[];
}

export const reports: Report[] = [
  {
    slug: 'milk-after-vat-july-2026',
    title: 'Milk After VAT: What Batswana Are Actually Paying — July 2026',
    category: 'Dairy',
    date: 'August 2026',
    pages: 9,
    icon: 'water_drop',
    description: 'From 1 July 2026, milk attracts VAT at 14% under the new VAT Act. We tracked 2,963 real milk purchases from 310 Gaborone consumers to measure exactly how much of the tax reached the shelf — and how fast.',
    summary: 'The second issue of the BasketIQ Consumer Goods Report. On 1 July 2026 the VAT Act, 2026 came into force, and milk was left off the zero-rated foodstuffs list — putting 14% on every litre. Tracking identical products on real till slips, we find retailers passed the tax on almost to the thebe: repriced milk lines stepped 13–14% between June and late July, with three products moving by exactly 14.0%. The increase is not food inflation — identical zero-rated staples (maize meal, cooking oil, sugar, bread, fresh vegetables) moved 0–1% over the same weeks. Repricing arrived two to five weeks late and unevenly, madila was caught in the net at +14.3%, and early August data hints that shoppers are already downsizing to small packs — which carry a 10–12% per-litre premium of their own.',
    insights: [
      {
        icon: 'trending_up',
        title: 'Full Pass-Through',
        description: 'Repriced milk lines stepped 13–14% between June and late July — three products moved by exactly 14.0%, the full VAT rate.',
      },
      {
        icon: 'science',
        title: 'The Control Group',
        description: 'Zero-rated staples on the same till slips — maize meal, cooking oil, sugar, bread, fresh veg — moved just 0–1%. This is tax, not inflation.',
      },
      {
        icon: 'schedule',
        title: 'The Repricing Lag',
        description: 'Shelves held June prices through mid-July, then repriced SKU by SKU over five weeks. The best-selling 1L line only moved in August.',
      },
      {
        icon: 'compress',
        title: 'The Downsizing Signal',
        description: '500ml packs jumped from 21% of milk purchases in July to 43% in early August — and small packs cost 10–12% more per litre.',
      },
    ],
    related: ['soft-drinks-q1-2026'],
  },
  {
    slug: 'soft-drinks-q1-2026',
    title: 'The Botswana Soft Drinks Snapshot — Q1 2026',
    category: 'Beverages',
    date: 'April 2026',
    pages: 8,
    icon: 'local_drink',
    description: 'Category intelligence on Botswana\'s soft drinks market, built from 599 real line items across 500 verified baskets from 168 Gaborone consumers, February to April 2026.',
    summary: 'The first issue in the BasketIQ Consumer Goods Report — Beverages series. We analysed 599 classified soft drinks purchases across 500 verified baskets in our Gaborone receipt panel between February and April 2026. The headline finding: one company — The Coca-Cola Company — is present on roughly seven in every ten soft drinks purchased in the sample. Coke alone accounts for 43% of all units and more than six in every ten Pula spent on the top five brands. The rest of the category splits thinly between a small number of independents, a handful of PepsiCo brands, and a long tail of local labels.',
    insights: [
      {
        icon: 'hub',
        title: 'Category Concentration',
        description: 'The Coca-Cola Company holds 70.8% of every soft drinks unit sold in the Gaborone sample across six owned brands.',
      },
      {
        icon: 'shopping_basket',
        title: 'Basket Penetration',
        description: 'Soft drinks appear in 13.8% of all verified Gaborone baskets, with an average category spend of BWP 26.89 per shop.',
      },
      {
        icon: 'sell',
        title: 'Price Anchoring',
        description: 'Almost six in every ten soft drinks purchases cost under P15. The modal price band is P10–P15, capturing 34.7% of purchases.',
      },
      {
        icon: 'link',
        title: 'Basket Attachment',
        description: 'When soft drinks are in the basket, bread, fresh milk, and chips are the most common co-purchased categories — not other beverages.',
      },
    ],
    related: ['milk-after-vat-july-2026'],
  },
];

export function getReport(slug: string): Report | undefined {
  return reports.find(r => r.slug === slug);
}

export function getRelatedReports(slugs: string[]): Report[] {
  return slugs.map(s => reports.find(r => r.slug === s)).filter((r): r is Report => !!r);
}

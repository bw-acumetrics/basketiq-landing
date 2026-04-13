export interface Report {
  slug: string;
  title: string;
  category: string;
  date: string;
  pages: number;
  pdf: string;
  icon: string;
  description: string;
  summary: string;
  insights: Array<{ icon: string; title: string; description: string }>;
  related: string[];
}

export const reports: Report[] = [
  {
    slug: 'soft-drinks-q1-2026',
    title: 'The Botswana Soft Drinks Snapshot — Q1 2026',
    category: 'Beverages',
    date: 'April 2026',
    pages: 8,
    pdf: '/reports/BasketIQ-Beverages-Soft-Drinks-Q1-2026.pdf',
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
    related: [],
  },
];

export function getReport(slug: string): Report | undefined {
  return reports.find(r => r.slug === slug);
}

export function getRelatedReports(slugs: string[]): Report[] {
  return slugs.map(s => reports.find(r => r.slug === s)).filter((r): r is Report => !!r);
}

/**
 * Predefined Research Sources
 * Curated list of high-quality financial, news, and market data sources
 * Users can enable/disable and add custom sources
 */

export interface PredefinedSource {
  id: string;
  name: string;
  url: string;
  category: 'saudi_market' | 'international_market' | 'news' | 'analysis' | 'data' | 'official';
  description: string;
  priority: number; // Higher = crawl first
  enabled: boolean;
}

export const PREDEFINED_SOURCES: PredefinedSource[] = [
  // Saudi Market Sources (Priority: 100-90)
  {
    id: 'tadawul',
    name: 'Saudi Exchange (Tadawul)',
    url: 'https://www.saudiexchange.sa',
    category: 'official',
    description: 'Official Saudi stock exchange',
    priority: 100,
    enabled: true,
  },
  {
    id: 'argaam',
    name: 'Argaam',
    url: 'https://www.argaam.com',
    category: 'saudi_market',
    description: 'IPO coverage and Saudi market data',
    priority: 95,
    enabled: true,
  },
  {
    id: 'mubasher',
    name: 'Mubasher',
    url: 'https://www.mubasher.info',
    category: 'saudi_market',
    description: 'Market news and real-time quotes',
    priority: 93,
    enabled: true,
  },
  {
    id: 'aleqtisadiah',
    name: 'Al Eqtisadiah',
    url: 'https://www.aleqt.com',
    category: 'news',
    description: 'Saudi economic and IPO news',
    priority: 90,
    enabled: true,
  },
  {
    id: 'asharq_business',
    name: 'Asharq Business',
    url: 'https://asharqbusiness.com',
    category: 'news',
    description: 'Capital markets and business news',
    priority: 88,
    enabled: true,
  },
  {
    id: 'arab_news',
    name: 'Arab News',
    url: 'https://www.arabnews.com',
    category: 'news',
    description: 'IPO reporting and regional news',
    priority: 85,
    enabled: true,
  },
  {
    id: 'saudi_gazette',
    name: 'Saudi Gazette',
    url: 'https://saudigazette.com.sa',
    category: 'news',
    description: 'Business and market news',
    priority: 83,
    enabled: true,
  },

  // International Market Data (Priority: 80-70)
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    url: 'https://www.bloomberg.com',
    category: 'international_market',
    description: 'Deal intelligence and global markets',
    priority: 80,
    enabled: true,
  },
  {
    id: 'reuters',
    name: 'Reuters',
    url: 'https://www.reuters.com',
    category: 'news',
    description: 'Global IPO and financial news',
    priority: 78,
    enabled: true,
  },
  {
    id: 'ft',
    name: 'Financial Times',
    url: 'https://www.ft.com',
    category: 'news',
    description: 'Market analysis and insights',
    priority: 76,
    enabled: true,
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch',
    url: 'https://www.marketwatch.com',
    category: 'news',
    description: 'Market news and commentary',
    priority: 74,
    enabled: true,
  },
  {
    id: 'yahoo_finance',
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com',
    category: 'data',
    description: 'Company data and stock quotes',
    priority: 72,
    enabled: true,
  },
  {
    id: 'marketscreener',
    name: 'MarketScreener',
    url: 'https://www.marketscreener.com',
    category: 'data',
    description: 'IPO profiles and company data',
    priority: 70,
    enabled: true,
  },

  // Analysis & Research (Priority: 60-50)
  {
    id: 'tradingview',
    name: 'TradingView',
    url: 'https://www.tradingview.com',
    category: 'analysis',
    description: 'Price charts and technical analysis',
    priority: 65,
    enabled: true,
  },
  {
    id: 'simplywall_st',
    name: 'Simply Wall Street',
    url: 'https://simplywall.st',
    category: 'analysis',
    description: 'Fundamental analysis and valuations',
    priority: 63,
    enabled: true,
  },
  {
    id: 'seeking_alpha',
    name: 'Seeking Alpha',
    url: 'https://seekingalpha.com',
    category: 'analysis',
    description: 'Equity research and analysis',
    priority: 61,
    enabled: true,
  },
  {
    id: 'morningstar',
    name: 'Morningstar',
    url: 'https://www.morningstar.com',
    category: 'analysis',
    description: 'Valuation data and ratings',
    priority: 59,
    enabled: true,
  },
  {
    id: 'zacks',
    name: 'Zacks Investment Research',
    url: 'https://www.zacks.com',
    category: 'analysis',
    description: 'Earnings data and stock research',
    priority: 57,
    enabled: true,
  },
  {
    id: 'koyfin',
    name: 'Koyfin',
    url: 'https://www.koyfin.com',
    category: 'data',
    description: 'Macro data and financial analytics',
    priority: 55,
    enabled: true,
  },
  {
    id: 'stockanalysis',
    name: 'StockAnalysis',
    url: 'https://stockanalysis.com',
    category: 'data',
    description: 'Financial statements and metrics',
    priority: 53,
    enabled: true,
  },
  {
    id: 'investing_com',
    name: 'Investing.com',
    url: 'https://www.investing.com',
    category: 'data',
    description: 'Market data and economic calendar',
    priority: 51,
    enabled: true,
  },
  {
    id: 'trading_economics',
    name: 'Trading Economics',
    url: 'https://tradingeconomics.com',
    category: 'data',
    description: 'Economic indicators and forecasts',
    priority: 50,
    enabled: true,
  },

  // News Aggregators (Priority: 40-30)
  {
    id: 'newsapi',
    name: 'NewsAPI',
    url: 'https://newsapi.org',
    category: 'news',
    description: 'Headline aggregation service',
    priority: 45,
    enabled: false, // API-based, disabled by default
  },
  {
    id: 'gnews',
    name: 'GNews',
    url: 'https://gnews.io',
    category: 'news',
    description: 'Global news headlines',
    priority: 43,
    enabled: false, // API-based, disabled by default
  },
  {
    id: 'mediastack',
    name: 'Mediastack',
    url: 'https://mediastack.com',
    category: 'news',
    description: 'News aggregation API',
    priority: 41,
    enabled: false, // API-based, disabled by default
  },
];

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: PredefinedSource['category']): PredefinedSource[] {
  return PREDEFINED_SOURCES.filter(s => s.category === category);
}

/**
 * Get enabled sources sorted by priority
 */
export function getEnabledSources(): PredefinedSource[] {
  return PREDEFINED_SOURCES
    .filter(s => s.enabled)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get source URLs for crawling
 */
export function getSourceUrls(enabledOnly: boolean = true): string[] {
  const sources = enabledOnly ? getEnabledSources() : PREDEFINED_SOURCES;
  return sources.map(s => s.url);
}

/**
 * Get source by ID
 */
export function getSourceById(id: string): PredefinedSource | undefined {
  return PREDEFINED_SOURCES.find(s => s.id === id);
}

/**
 * Format sources for search engine constraint
 */
export function formatSourcesForSearch(sources: PredefinedSource[]): string {
  return sources
    .map(s => `site:${new URL(s.url).hostname}`)
    .join(' OR ');
}

/**
 * Category labels and colors
 */
export const SOURCE_CATEGORIES = {
  saudi_market: {
    label: 'Saudi Market',
    color: 'emerald',
    icon: '🇸🇦',
  },
  international_market: {
    label: 'International Market',
    color: 'blue',
    icon: '🌍',
  },
  news: {
    label: 'News',
    color: 'amber',
    icon: '📰',
  },
  analysis: {
    label: 'Analysis',
    color: 'purple',
    icon: '📊',
  },
  data: {
    label: 'Data',
    color: 'cyan',
    icon: '💹',
  },
  official: {
    label: 'Official',
    color: 'green',
    icon: '🏛️',
  },
} as const;

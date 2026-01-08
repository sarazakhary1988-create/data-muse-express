// Data Source Connector Configuration
// Each connector represents a different data/news API source

export interface DataSourceConnector {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'official' | 'news' | 'financial' | 'aggregator';
  apiType: 'rest' | 'rss' | 'websocket';
  baseUrl?: string;
  requiresAuth: boolean;
  keywordTransform?: (keyword: string, category?: string) => string;
}

export const DATA_SOURCE_CONNECTORS: DataSourceConnector[] = [
  {
    id: 'auto',
    name: 'Auto-Select',
    description: 'Automatically select best sources for query',
    icon: '🔮',
    category: 'aggregator',
    apiType: 'rest',
    requiresAuth: false,
  },
  // Official/Government Sources
  {
    id: 'cma',
    name: 'CMA Official API',
    description: 'Saudi Capital Market Authority official data',
    icon: '🏛️',
    category: 'official',
    apiType: 'rest',
    baseUrl: 'https://cma.org.sa',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:cma.org.sa ${keyword}`,
  },
  {
    id: 'tadawul',
    name: 'Saudi Exchange (Tadawul)',
    description: 'Official Saudi Stock Exchange listings & announcements',
    icon: '📈',
    category: 'official',
    apiType: 'rest',
    baseUrl: 'https://www.saudiexchange.sa',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:saudiexchange.sa OR site:tadawul.com.sa ${keyword}`,
  },
  {
    id: 'sec',
    name: 'SEC EDGAR',
    description: 'US SEC filings database',
    icon: '🏛️',
    category: 'official',
    apiType: 'rest',
    baseUrl: 'https://www.sec.gov',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:sec.gov ${keyword}`,
  },
  // Saudi/Regional News
  {
    id: 'argaam',
    name: 'Argaam',
    description: 'IPO coverage & Saudi financial news',
    icon: '📊',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.argaam.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:argaam.com ${keyword}`,
  },
  {
    id: 'mubasher',
    name: 'Mubasher',
    description: 'Real-time market news & data',
    icon: '📡',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.mubasher.info',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:mubasher.info ${keyword}`,
  },
  {
    id: 'aleqt',
    name: 'Al Eqtisadiah',
    description: 'Saudi IPO & business news',
    icon: '🗞️',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.aleqt.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:aleqt.com ${keyword}`,
  },
  {
    id: 'asharq',
    name: 'Asharq Business',
    description: 'Capital markets & business news',
    icon: '💼',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://asharqbusiness.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:asharqbusiness.com ${keyword}`,
  },
  {
    id: 'arabnews',
    name: 'Arab News',
    description: 'IPO reporting & regional business',
    icon: '📰',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.arabnews.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:arabnews.com ${keyword}`,
  },
  {
    id: 'saudigazette',
    name: 'Saudi Gazette',
    description: 'Saudi business news',
    icon: '📰',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://saudigazette.com.sa',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:saudigazette.com.sa ${keyword}`,
  },
  // Premium Global News
  {
    id: 'reuters',
    name: 'Reuters',
    description: 'IPO news & global wire service',
    icon: '📰',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.reuters.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:reuters.com ${keyword}`,
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    description: 'Deal intelligence & financial news',
    icon: '💹',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.bloomberg.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:bloomberg.com ${keyword}`,
  },
  {
    id: 'ft',
    name: 'Financial Times',
    description: 'Market analysis & premium content',
    icon: '🗞️',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.ft.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:ft.com ${keyword}`,
  },
  // Financial Data Providers
  {
    id: 'yahoo',
    name: 'Yahoo Finance',
    description: 'Company data & market quotes',
    icon: '📊',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://finance.yahoo.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:finance.yahoo.com ${keyword}`,
  },
  {
    id: 'tradingview',
    name: 'TradingView',
    description: 'Price charts & technical analysis',
    icon: '📉',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.tradingview.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:tradingview.com ${keyword}`,
  },
  {
    id: 'marketscreener',
    name: 'MarketScreener',
    description: 'IPO profiles & company data',
    icon: '🔍',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.marketscreener.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:marketscreener.com ${keyword}`,
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch',
    description: 'Market news & stock data',
    icon: '📈',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.marketwatch.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:marketwatch.com ${keyword}`,
  },
  {
    id: 'simplywall',
    name: 'Simply Wall St',
    description: 'Fundamental analysis & valuation',
    icon: '🧱',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://simplywall.st',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:simplywall.st ${keyword}`,
  },
  {
    id: 'investing',
    name: 'Investing.com',
    description: 'Market data & financial news',
    icon: '📊',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.investing.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:investing.com ${keyword}`,
  },
  {
    id: 'seekingalpha',
    name: 'Seeking Alpha',
    description: 'Equity analysis & research',
    icon: '🔬',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://seekingalpha.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:seekingalpha.com ${keyword}`,
  },
  {
    id: 'morningstar',
    name: 'Morningstar',
    description: 'Valuation data & ratings',
    icon: '⭐',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.morningstar.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:morningstar.com ${keyword}`,
  },
  {
    id: 'zacks',
    name: 'Zacks Investment Research',
    description: 'Earnings data & stock rankings',
    icon: '📈',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.zacks.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:zacks.com ${keyword}`,
  },
  {
    id: 'koyfin',
    name: 'Koyfin',
    description: 'Macro data & financial analytics',
    icon: '📉',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.koyfin.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:koyfin.com ${keyword}`,
  },
  {
    id: 'stockanalysis',
    name: 'StockAnalysis',
    description: 'Financial statements & metrics',
    icon: '📑',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://stockanalysis.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:stockanalysis.com ${keyword}`,
  },
  {
    id: 'tradingeconomics',
    name: 'Trading Economics',
    description: 'Market indicators & economic data',
    icon: '🌍',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://tradingeconomics.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:tradingeconomics.com ${keyword}`,
  },
  // API Aggregators
  {
    id: 'newsapi',
    name: 'NewsAPI',
    description: 'Headline aggregation API',
    icon: '📡',
    category: 'aggregator',
    apiType: 'rest',
    baseUrl: 'https://newsapi.org',
    requiresAuth: true,
  },
  {
    id: 'mediastack',
    name: 'Mediastack',
    description: 'News aggregation API',
    icon: '📺',
    category: 'aggregator',
    apiType: 'rest',
    baseUrl: 'https://mediastack.com',
    requiresAuth: true,
  },
  {
    id: 'gnews',
    name: 'GNews',
    description: 'Global headlines aggregator',
    icon: '🌐',
    category: 'aggregator',
    apiType: 'rest',
    baseUrl: 'https://gnews.io',
    requiresAuth: true,
  },
  // Financial APIs (require auth)
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Stock market data API',
    icon: '📈',
    category: 'financial',
    apiType: 'rest',
    requiresAuth: true,
  },
  {
    id: 'polygon',
    name: 'Polygon.io',
    description: 'Financial market data',
    icon: '🔷',
    category: 'financial',
    apiType: 'rest',
    requiresAuth: true,
  },
  {
    id: 'iex',
    name: 'IEX Cloud',
    description: 'Stock and financial data',
    icon: '☁️',
    category: 'financial',
    apiType: 'rest',
    requiresAuth: true,
  },
  {
    id: 'twelvedata',
    name: 'Twelve Data',
    description: 'Financial market data API',
    icon: '📊',
    category: 'financial',
    apiType: 'rest',
    requiresAuth: true,
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Real-time stock API',
    icon: '🦈',
    category: 'financial',
    apiType: 'rest',
    requiresAuth: true,
  },
];

// Category-specific keyword mappings
export const CATEGORY_KEYWORD_MAP: Record<string, string> = {
  cma: 'CMA announcement OR regulation OR violation OR fine OR penalty',
  ipo: 'IPO OR "initial public offering" OR listing OR prospectus',
  acquisition: 'merger OR acquisition OR M&A OR takeover OR buyout',
  banking: 'banking sector OR bank OR "financial services" OR lending',
  real_estate: '"real estate" OR "property development" OR construction OR housing',
  tech_funding: 'technology OR startup OR software OR "tech company" OR venture',
  vision_2030: '"Vision 2030" OR "Saudi Vision 2030" OR NEOM OR giga-project',
  expansion: 'expansion OR opening OR launch OR "new branch" OR growth',
  market: 'stock market OR trading OR index OR shares',
  regulatory: 'regulation OR compliance OR filing OR rules',
  contract: 'contract awarded OR deal OR agreement',
  appointment: 'CEO OR chairman OR director appointed OR executive',
  joint_venture: 'joint venture OR partnership OR MOU OR alliance',
};

export function buildQueryForConnector(
  connector: DataSourceConnector,
  baseQuery: string,
  category?: string
): string {
  let query = baseQuery;

  // Add category-specific keywords if category is selected
  if (category && category !== 'all' && CATEGORY_KEYWORD_MAP[category]) {
    query = `${CATEGORY_KEYWORD_MAP[category]} ${query}`;
  }

  // Apply connector-specific transformation
  if (connector.keywordTransform) {
    query = connector.keywordTransform(query, category);
  }

  return query;
}

export function getConnectorById(id: string): DataSourceConnector | undefined {
  return DATA_SOURCE_CONNECTORS.find(c => c.id === id);
}

export function getConnectorsByCategory(category: DataSourceConnector['category']): DataSourceConnector[] {
  return DATA_SOURCE_CONNECTORS.filter(c => c.category === category);
}

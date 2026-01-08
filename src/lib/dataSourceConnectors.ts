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
    id: 'argaam',
    name: 'Argaam Feed',
    description: 'Argaam financial news and data',
    icon: '📊',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.argaam.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:argaam.com ${keyword}`,
  },
  {
    id: 'tadawul',
    name: 'Tadawul News',
    description: 'Saudi Stock Exchange official announcements',
    icon: '📈',
    category: 'official',
    apiType: 'rest',
    baseUrl: 'https://www.saudiexchange.sa',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:saudiexchange.sa OR site:tadawul.com.sa ${keyword}`,
  },
  {
    id: 'reuters',
    name: 'Reuters API',
    description: 'Reuters news wire service',
    icon: '📰',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.reuters.com',
    requiresAuth: true,
    keywordTransform: (keyword) => `site:reuters.com ${keyword}`,
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg API',
    description: 'Bloomberg financial data and news',
    icon: '💹',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://www.bloomberg.com',
    requiresAuth: true,
    keywordTransform: (keyword) => `site:bloomberg.com ${keyword}`,
  },
  {
    id: 'ft',
    name: 'Financial Times API',
    description: 'Financial Times premium content',
    icon: '🗞️',
    category: 'news',
    apiType: 'rest',
    baseUrl: 'https://www.ft.com',
    requiresAuth: true,
    keywordTransform: (keyword) => `site:ft.com ${keyword}`,
  },
  {
    id: 'yahoo',
    name: 'Yahoo Finance API',
    description: 'Yahoo Finance market data',
    icon: '📊',
    category: 'financial',
    apiType: 'rest',
    baseUrl: 'https://finance.yahoo.com',
    requiresAuth: false,
    keywordTransform: (keyword) => `site:finance.yahoo.com ${keyword}`,
  },
  {
    id: 'newsapi',
    name: 'NewsAPI',
    description: 'News aggregator API',
    icon: '📡',
    category: 'aggregator',
    apiType: 'rest',
    requiresAuth: true,
  },
  {
    id: 'mediastack',
    name: 'MediaStack API',
    description: 'Real-time news data',
    icon: '📺',
    category: 'aggregator',
    apiType: 'rest',
    requiresAuth: true,
  },
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

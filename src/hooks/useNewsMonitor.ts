import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateUrl, OFFICIAL_DOMAINS, VERIFIED_DOMAINS, PREMIUM_DOMAINS } from '@/lib/urlValidator';
import { withLLMConfig } from '@/lib/llmConfig';

// MANUS 1.7 MAX - Complete News Categories per specification
export type NewsCategory = 
  | 'tasi'              // TASI/Main Market
  | 'nomu'              // NOMU/Parallel Market
  | 'listing_approved'  // Announced/Approved Listing
  | 'stock_market'      // Saudi Stock Market / Country Stock Market
  | 'management_change' // Management Changes
  | 'regulator_announcement' // CMA Announcements / Country Regulator
  | 'regulator_regulation'   // CMA Regulations / Country Regulator
  | 'regulator_violation'    // CMA Violations / Country Regulator
  | 'shareholder_change'     // Shareholder Changes
  | 'macroeconomics'         // Macroeconomics
  | 'microeconomics'         // Microeconomics
  | 'country_outlook'        // Market outlook and country updates
  | 'joint_venture'          // JV
  | 'merger_acquisition'     // M&A
  | 'expansion_contract'     // Expansion/Contracts
  | 'general';               // Other news

export type NewsRegion = 'mena' | 'europe' | 'americas' | 'asia_pacific' | 'global';

export type RefreshInterval = 1 | 5 | 15 | 30;

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: Date;
  category: NewsCategory;
  isNew: boolean;
  snippet?: string;
  country?: string;
  region?: NewsRegion;
  companies?: string[];
  isOfficial?: boolean;
  isValidated?: boolean;
}

interface NewsMonitorState {
  news: NewsItem[];
  isMonitoring: boolean;
  lastCheck: Date | null;
  isLoading: boolean;
  error: string | null;
  refreshInterval: RefreshInterval;
  secondsUntilRefresh: number;
}

const NEWS_STORAGE_KEY = 'orkestra_monitored_news';
const LAST_CHECK_KEY = 'orkestra_last_news_check';
const REFRESH_INTERVAL_KEY = 'orkestra_news_refresh_interval';

// Country-specific regulator mapping
export const COUNTRY_REGULATORS: Record<string, { name: string; shortName: string; domains: string[] }> = {
  'Saudi Arabia': { name: 'Capital Market Authority', shortName: 'CMA', domains: ['cma.org.sa', 'cma.gov.sa'] },
  'UAE': { name: 'Securities and Commodities Authority', shortName: 'SCA', domains: ['sca.gov.ae'] },
  'Dubai': { name: 'Dubai Financial Services Authority', shortName: 'DFSA', domains: ['dfsa.ae'] },
  'Bahrain': { name: 'Central Bank of Bahrain', shortName: 'CBB', domains: ['cbb.gov.bh'] },
  'Kuwait': { name: 'Capital Markets Authority', shortName: 'CMA-KW', domains: ['cma.gov.kw'] },
  'Qatar': { name: 'Qatar Financial Markets Authority', shortName: 'QFMA', domains: ['qfma.org.qa'] },
  'Oman': { name: 'Capital Market Authority', shortName: 'CMA-OM', domains: ['cma.gov.om'] },
  'Egypt': { name: 'Financial Regulatory Authority', shortName: 'FRA', domains: ['fra.gov.eg'] },
  'USA': { name: 'Securities and Exchange Commission', shortName: 'SEC', domains: ['sec.gov'] },
  'UK': { name: 'Financial Conduct Authority', shortName: 'FCA', domains: ['fca.org.uk'] },
};

// Country-specific stock exchange mapping
export const COUNTRY_EXCHANGES: Record<string, { name: string; shortName: string; domains: string[] }> = {
  'Saudi Arabia': { name: 'Saudi Exchange (Tadawul)', shortName: 'Tadawul', domains: ['saudiexchange.sa', 'tadawul.com.sa'] },
  'UAE': { name: 'Abu Dhabi Securities Exchange', shortName: 'ADX', domains: ['adx.ae'] },
  'Dubai': { name: 'Dubai Financial Market', shortName: 'DFM', domains: ['dfm.ae'] },
  'Bahrain': { name: 'Bahrain Bourse', shortName: 'BHB', domains: ['bahrainbourse.com'] },
  'Kuwait': { name: 'Boursa Kuwait', shortName: 'BK', domains: ['boursakuwait.com.kw'] },
  'Qatar': { name: 'Qatar Stock Exchange', shortName: 'QSE', domains: ['qe.com.qa'] },
  'Oman': { name: 'Muscat Securities Market', shortName: 'MSM', domains: ['msm.gov.om'] },
  'Egypt': { name: 'Egyptian Exchange', shortName: 'EGX', domains: ['egx.com.eg'] },
  'USA': { name: 'NYSE/NASDAQ', shortName: 'NYSE', domains: ['nyse.com', 'nasdaq.com'] },
  'UK': { name: 'London Stock Exchange', shortName: 'LSE', domains: ['londonstockexchange.com'] },
};

// Official sources for higher trust
const OFFICIAL_SOURCES = [
  'tadawul', 'saudiexchange', 'cma.org.sa', 'cma.gov.sa', 'argaam', 'zawya',
  'sec.gov', 'nasdaq', 'nyse', 'lseg', 'londonstockexchange',
  'reuters', 'bloomberg', 'ft.com', 'wsj.com', 'yahoo', 'sama.gov.sa', 'mof.gov.sa',
  'dfsa.ae', 'sca.gov.ae', 'cbb.gov.bh', 'qfma.org.qa', 'cma.gov.kw', 'cma.gov.om'
];

// Country detection patterns
const COUNTRY_PATTERNS: Record<string, RegExp> = {
  'Saudi Arabia': /\b(saudi|ksa|riyadh|jeddah|tadawul|aramco|sabic|stc|tasi|nomu)\b/i,
  'UAE': /\b(uae|dubai|abu dhabi|emirates|adx|dfm|emaar)\b/i,
  'Kuwait': /\b(kuwait|boursa)\b/i,
  'Qatar': /\b(qatar|doha|qse)\b/i,
  'Bahrain': /\b(bahrain|manama|bhb)\b/i,
  'Oman': /\b(oman|muscat|msm)\b/i,
  'Egypt': /\b(egypt|cairo|egx)\b/i,
  'USA': /\b(usa|us market|nasdaq|nyse|american|sec)\b/i,
  'UK': /\b(uk|britain|london|lse|ftse)\b/i,
};

const REGION_MAP: Record<string, NewsRegion> = {
  'Saudi Arabia': 'mena', 'UAE': 'mena', 'Kuwait': 'mena', 'Qatar': 'mena',
  'Bahrain': 'mena', 'Oman': 'mena', 'Egypt': 'mena',
  'USA': 'americas', 'UK': 'europe',
};

export interface NewsFilters {
  categories?: string[];
  countries?: string[];
  sources?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

// MANUS 1.7 MAX - Category-specific keyword mapping
const MANUS_CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  // TASI/Main Market
  tasi: [
    'TASI', 'Main Market', 'Tadawul main', 'Saudi Exchange main market', 
    'TASI index', 'main market listing', 'TASI performance', 'blue chip Saudi'
  ],
  // NOMU/Parallel Market
  nomu: [
    'NOMU', 'Parallel Market', 'NOMU listing', 'parallel market Saudi',
    'NOMU index', 'NOMU performance', 'SME market Saudi'
  ],
  // Announced/Approved Listing
  listing_approved: [
    'CMA approval listing', 'approved for listing', 'IPO approval', 
    'listing prospectus approved', 'CMA listing approval', 'going public',
    'initial public offering approval', 'Tadawul listing approved'
  ],
  // Stock Market
  stock_market: [
    'stock market', 'Saudi stock market', 'market update', 'market performance',
    'trading session', 'market close', 'index movement', 'equity market',
    'stock exchange', 'market capitalization', 'trading volume'
  ],
  // Management Changes
  management_change: [
    'CEO appointed', 'CEO resigned', 'chairman appointed', 'chairman resigned',
    'board member', 'executive appointment', 'CFO', 'director resignation',
    'management change', 'board of directors', 'executive resignation',
    'COO appointed', 'managing director'
  ],
  // Regulator Announcements
  regulator_announcement: [
    'CMA announcement', 'regulator announcement', 'Capital Market Authority',
    'CMA notice', 'regulatory notice', 'CMA circular', 'authority announcement',
    'licensed', 'license granted', 'authorization', 'registration approved'
  ],
  // Regulator Regulations
  regulator_regulation: [
    'CMA regulation', 'new regulation', 'regulatory update', 'rules amendment',
    'compliance requirement', 'regulatory framework', 'market rules',
    'governance rules', 'disclosure rules', 'trading rules'
  ],
  // Regulator Violations
  regulator_violation: [
    'CMA violation', 'fine imposed', 'penalty', 'regulatory fine',
    'market manipulation', 'insider trading', 'disclosure violation',
    'suspended', 'trading suspension', 'enforcement action'
  ],
  // Shareholder Changes
  shareholder_change: [
    'shareholder change', 'stake acquisition', 'shareholding change',
    'ownership change', 'major shareholder', 'stake sale', 'block trade',
    'share disposal', 'share acquisition', 'ownership disclosure'
  ],
  // Macroeconomics
  macroeconomics: [
    'GDP', 'inflation', 'interest rate', 'central bank', 'monetary policy',
    'fiscal policy', 'government spending', 'national budget', 'economic growth',
    'unemployment rate', 'trade balance', 'foreign reserves'
  ],
  // Microeconomics
  microeconomics: [
    'company earnings', 'profit margin', 'revenue growth', 'cost reduction',
    'market share', 'pricing strategy', 'consumer demand', 'supply chain',
    'operational efficiency', 'sector performance'
  ],
  // Country Outlook
  country_outlook: [
    'market outlook', 'economic outlook', 'country outlook', 'investment outlook',
    'growth forecast', 'economic forecast', 'sector outlook', 'market analysis',
    'economic analysis', 'country report'
  ],
  // Joint Ventures
  joint_venture: [
    'joint venture', 'JV agreement', 'partnership agreement', 'strategic alliance',
    'MOU signed', 'collaboration agreement', 'business partnership'
  ],
  // Mergers & Acquisitions
  merger_acquisition: [
    'merger', 'acquisition', 'M&A', 'buyout', 'takeover', 'merger agreement',
    'acquisition completed', 'deal closed', 'consolidation'
  ],
  // Expansion/Contracts
  expansion_contract: [
    'expansion', 'contract awarded', 'new project', 'contract signed',
    'project contract', 'tender won', 'expansion plan', 'new facility',
    'market entry', 'growth investment'
  ],
  // General News
  general: [
    'news', 'update', 'announcement', 'report', 'statement'
  ],
};

// Get regulator-specific keywords based on country
function getRegulatorKeywords(country: string, category: NewsCategory): string[] {
  const regulator = COUNTRY_REGULATORS[country];
  const exchange = COUNTRY_EXCHANGES[country];
  
  const baseKeywords = MANUS_CATEGORY_KEYWORDS[category] || [];
  
  if (!regulator) return baseKeywords;
  
  // Replace generic CMA keywords with country-specific regulator
  return baseKeywords.map(keyword => {
    if (keyword.toLowerCase().includes('cma') && country !== 'Saudi Arabia') {
      return keyword.replace(/CMA/gi, regulator.shortName);
    }
    return keyword;
  }).concat([
    regulator.name,
    regulator.shortName,
    ...regulator.domains
  ]);
}

// Build search queries based on filters
function buildFilteredQueries(filters?: NewsFilters): string[] {
  const queries: string[] = [];
  const activeCountries = filters?.countries?.filter(c => c !== 'all') || [];
  const activeCategories = filters?.categories?.filter(c => c !== 'all') || [];
  const activeSources = filters?.sources?.filter(s => s !== 'all') || [];
  
  // Source-to-site mapping
  const sourceToSite: Record<string, string> = {
    argaam: 'site:argaam.com',
    zawya: 'site:zawya.com',
    reuters: 'site:reuters.com',
    bloomberg: 'site:bloomberg.com',
    arabnews: 'site:arabnews.com',
    ft: 'site:ft.com',
    yahoo: 'site:finance.yahoo.com',
    tadawul: 'site:saudiexchange.sa OR site:tadawul.com.sa',
    cma: 'site:cma.org.sa OR site:cma.gov.sa',
  };

  const siteStr = activeSources.length > 0
    ? activeSources.map(s => sourceToSite[s] || '').filter(Boolean).join(' OR ')
    : '';

  // Category-specific queries with country awareness
  if (activeCategories.length > 0) {
    activeCategories.forEach(category => {
      const countries = activeCountries.length > 0 ? activeCountries : ['Saudi Arabia'];
      
      countries.forEach(country => {
        const keywords = getRegulatorKeywords(country, category as NewsCategory);
        if (keywords.length > 0) {
          const keywordQuery = keywords.slice(0, 4).join(' OR ');
          queries.push(`(${keywordQuery}) ${country}${siteStr ? ' ' + siteStr : ''}`);
        }
      });
    });
  }
  // Countries only
  else if (activeCountries.length > 0) {
    activeCountries.forEach(country => {
      const regulator = COUNTRY_REGULATORS[country];
      const exchange = COUNTRY_EXCHANGES[country];
      
      queries.push(`financial news ${country}${siteStr ? ' ' + siteStr : ''}`);
      queries.push(`stock market ${exchange?.shortName || country}${siteStr ? ' ' + siteStr : ''}`);
      if (regulator) {
        queries.push(`${regulator.shortName} announcement ${country}${siteStr ? ' ' + siteStr : ''}`);
      }
    });
  }
  // Sources only
  else if (activeSources.length > 0) {
    queries.push(`financial news GCC ${siteStr}`);
    queries.push(`Saudi Arabia market ${siteStr}`);
  }
  // No filters - default Saudi queries
  else {
    queries.push('TASI Tadawul main market performance');
    queries.push('NOMU parallel market Saudi');
    queries.push('CMA announcement Saudi Arabia');
    queries.push('CMA violation fine Saudi');
    queries.push('CEO chairman appointment resignation Tadawul');
    queries.push('shareholder change stake Saudi');
    queries.push('IPO listing approval CMA Tadawul');
    queries.push('Saudi Arabia economic outlook GDP');
    queries.push('joint venture merger acquisition Saudi');
  }

  console.log('[NewsMonitor] MANUS keyword-specific queries:', queries);
  return [...new Set(queries)].slice(0, 12);
}

// Categorize news based on content
function categorizeNews(title: string, snippet: string, country?: string): NewsCategory {
  const text = `${title} ${snippet}`.toLowerCase();
  
  // Order matters - more specific categories first
  
  // TASI/Main Market
  if (/\b(tasi|main market|tadawul main|blue chip)\b/.test(text) && 
      !/\bnomu\b/.test(text)) {
    return 'tasi';
  }
  
  // NOMU/Parallel Market
  if (/\b(nomu|parallel market|sme market)\b/.test(text)) {
    return 'nomu';
  }
  
  // Listing Approved
  if (/\b(listing approv|ipo approv|prospectus approv|cma approv.*listing|approved for listing)\b/.test(text)) {
    return 'listing_approved';
  }
  
  // Management Changes
  if (/\b(ceo|cfo|coo|chairman|director|board member|executive).*(appoint|resign|named|hire|step down|departure)\b/.test(text) ||
      /\b(appoint|resign|named|hire).*(ceo|cfo|coo|chairman|director|board member|executive)\b/.test(text)) {
    return 'management_change';
  }
  
  // Regulator Violations
  if (/\b(violation|fine|penalty|suspended|enforcement|insider trading|manipulation)\b/.test(text) &&
      /\b(cma|regulator|authority|sec|dfsa|cbb|sca)\b/.test(text)) {
    return 'regulator_violation';
  }
  
  // Regulator Regulations
  if (/\b(regulation|rules|framework|compliance|amendment|governance)\b/.test(text) &&
      /\b(cma|regulator|authority|sec|dfsa|cbb|sca|new)\b/.test(text)) {
    return 'regulator_regulation';
  }
  
  // Regulator Announcements
  if (/\b(cma|regulator|authority|sec|dfsa|cbb|sca)\b/.test(text) &&
      /\b(announcement|announce|circular|notice|license|authorization)\b/.test(text)) {
    return 'regulator_announcement';
  }
  
  // Shareholder Changes
  if (/\b(shareholder|stake|ownership|block trade|share disposal|share acquisition|shareholding)\b/.test(text) &&
      /\b(change|acquire|sale|bought|sold|disclosure|increase|decrease)\b/.test(text)) {
    return 'shareholder_change';
  }
  
  // Macroeconomics
  if (/\b(gdp|inflation|interest rate|central bank|monetary policy|fiscal|budget|economic growth|unemployment|trade balance|foreign reserve)\b/.test(text)) {
    return 'macroeconomics';
  }
  
  // Microeconomics
  if (/\b(earnings|profit margin|revenue|cost|market share|pricing|consumer demand|supply chain|operational)\b/.test(text) &&
      !/\b(stock market|index|trading)\b/.test(text)) {
    return 'microeconomics';
  }
  
  // Country Outlook
  if (/\b(outlook|forecast|analysis|report)\b/.test(text) &&
      /\b(market|economic|country|sector|investment|growth)\b/.test(text)) {
    return 'country_outlook';
  }
  
  // Joint Venture
  if (/\b(joint venture|jv|partnership|alliance|mou|collaboration)\b/.test(text) &&
      /\b(sign|agree|form|establish|announce)\b/.test(text)) {
    return 'joint_venture';
  }
  
  // M&A
  if (/\b(merger|acquisition|m&a|buyout|takeover|consolidation)\b/.test(text)) {
    return 'merger_acquisition';
  }
  
  // Expansion/Contracts
  if (/\b(expansion|contract|project|tender|facility|market entry)\b/.test(text) &&
      /\b(award|sign|win|new|plan|open)\b/.test(text)) {
    return 'expansion_contract';
  }
  
  // Stock Market (general market news)
  if (/\b(stock market|trading|index|equity|market cap|exchange)\b/.test(text)) {
    return 'stock_market';
  }
  
  return 'general';
}

// Detect country from text
function detectCountry(text: string): string | undefined {
  for (const [country, pattern] of Object.entries(COUNTRY_PATTERNS)) {
    if (pattern.test(text)) {
      return country;
    }
  }
  return undefined;
}

// Extract company names
function extractCompanies(text: string): string[] {
  const knownCompanies = [
    'Aramco', 'SABIC', 'STC', 'Al Rajhi', 'ACWA Power', 'Saudi National Bank',
    'Ma\'aden', 'NEOM', 'Red Sea', 'Riyad Bank', 'Mobily', 'Zain', 'Emaar',
    'ADNOC', 'Etisalat', 'QNB', 'KFH', 'Gulf Bank', 'Omantel'
  ];
  
  return knownCompanies.filter(company => 
    text.toLowerCase().includes(company.toLowerCase())
  );
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}

export function useNewsMonitor() {
  const [state, setState] = useState<NewsMonitorState>(() => {
    const savedInterval = localStorage.getItem(REFRESH_INTERVAL_KEY);
    return {
      news: [],
      isMonitoring: false,
      lastCheck: null,
      isLoading: false,
      error: null,
      refreshInterval: (savedInterval ? parseInt(savedInterval) : 5) as RefreshInterval,
      secondsUntilRefresh: 0,
    };
  });
  
  const [activeFilters, setActiveFilters] = useState<NewsFilters | undefined>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const seenNewsIds = useRef<Set<string>>(new Set());

  // Load persisted news from localStorage
  useEffect(() => {
    try {
      const storedNews = localStorage.getItem(NEWS_STORAGE_KEY);
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      
      if (storedNews) {
        const parsed = JSON.parse(storedNews) as NewsItem[];
        const newsWithDates = parsed.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp),
          isNew: false,
        }));
        setState(prev => ({ ...prev, news: newsWithDates }));
        newsWithDates.forEach(n => seenNewsIds.current.add(n.id));
      }
      
      if (lastCheck) {
        setState(prev => ({ ...prev, lastCheck: new Date(lastCheck) }));
      }
    } catch (e) {
      console.error('Failed to load news from storage:', e);
    }
  }, []);

  const persistNews = useCallback((news: NewsItem[]) => {
    try {
      const toStore = news.slice(0, 100);
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(toStore));
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    } catch (e) {
      console.error('Failed to persist news:', e);
    }
  }, []);

  const setRefreshInterval = useCallback((interval: RefreshInterval) => {
    localStorage.setItem(REFRESH_INTERVAL_KEY, interval.toString());
    setState(prev => ({ 
      ...prev, 
      refreshInterval: interval,
      secondsUntilRefresh: interval * 60 
    }));
  }, []);

  // URL validation
  const isValidNewsUrl = (url: string): boolean => {
    if (!url || !url.startsWith('http')) return false;
    const validation = validateUrl(url);
    if (!validation.hasValidStructure || validation.isSuspicious) {
      return false;
    }
    return validation.isValid;
  };
  
  // Source credibility
  const getSourceCredibility = (url: string, source: string): { isOfficial: boolean; isVerified: boolean; isPremium: boolean } => {
    const validation = validateUrl(url);
    const domain = validation.domain.toLowerCase();
    
    return {
      isOfficial: OFFICIAL_DOMAINS.some(d => domain.includes(d)) || 
                  OFFICIAL_SOURCES.some(s => source.toLowerCase().includes(s)),
      isVerified: VERIFIED_DOMAINS.some(d => domain.includes(d)),
      isPremium: PREMIUM_DOMAINS.some(d => domain.includes(d)),
    };
  };

  // Date range filter
  const isWithinDateRange = (timestamp: Date, dateFrom?: Date, dateTo?: Date): boolean => {
    const now = new Date();
    
    if (!dateFrom && !dateTo) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return timestamp >= sevenDaysAgo && timestamp <= now;
    }
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (timestamp < from) return false;
    }
    
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (timestamp > to) return false;
    }
    
    return true;
  };

  // Update filters
  const updateFilters = useCallback((filters: NewsFilters) => {
    setActiveFilters(filters);
  }, []);

  const fetchLatestNews = useCallback(async (filters?: NewsFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const currentFilters = filters || activeFilters;
    
    try {
      const queries = buildFilteredQueries(currentFilters);
      console.log('[NewsMonitor] Fetching with queries:', queries);
      
      const allResults: any[] = [];
      
      const batchSize = 3;
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(query => 
            supabase.functions.invoke('wide-research', {
              body: withLLMConfig({ query, maxResults: 15, newsMode: true }),
            })
          )
        );
        
        results.forEach(({ data }) => {
          const searchResults = data?.searchResults || data?.results || [];
          allResults.push(...searchResults);
        });
      }

      console.log('[NewsMonitor] Got total results:', allResults.length);
      
      const urlSet = new Set<string>();
      const newNewsItems: NewsItem[] = allResults
        .filter((result: any) => {
          if (!result.title || !result.url) return false;
          if (!isValidNewsUrl(result.url)) return false;
          if (urlSet.has(result.url)) return false;
          urlSet.add(result.url);
          return true;
        })
        .map((result: any) => {
          const id = `news_${btoa(result.url).slice(0, 20)}`;
          const isNew = !seenNewsIds.current.has(id);
          
          if (isNew) {
            seenNewsIds.current.add(id);
          }
          
          const source = (typeof result.source === 'string' && result.source.trim().length > 0)
            ? result.source
            : extractDomain(result.url);

          const snippet = (result.snippet || result.content || '').toString();
          const text = `${result.title} ${snippet}`;
          const country = detectCountry(text);

          const tsCandidate = result.fetchedAt || result.publishDate || result.publishedAt;
          const parsedTs = tsCandidate ? new Date(tsCandidate) : new Date();
          const timestamp = Number.isNaN(parsedTs.getTime()) ? new Date() : parsedTs;
          
          const credibility = getSourceCredibility(result.url, source);

          return {
            id,
            title: result.title,
            source,
            url: result.url,
            timestamp,
            category: categorizeNews(result.title, snippet, country),
            isNew,
            snippet: snippet.slice(0, 200) || '',
            country,
            region: country ? REGION_MAP[country] : 'global',
            companies: extractCompanies(text),
            isOfficial: credibility.isOfficial,
            isValidated: credibility.isVerified || credibility.isOfficial,
          };
        })
        .filter((item: NewsItem) => isWithinDateRange(item.timestamp, currentFilters?.dateFrom, currentFilters?.dateTo));

      setState(prev => {
        const existingIds = new Set(prev.news.map(n => n.id));
        const uniqueNew = newNewsItems.filter(n => !existingIds.has(n.id));
        const validNews = prev.news.filter(n => isWithinDateRange(n.timestamp, currentFilters?.dateFrom, currentFilters?.dateTo));
        const merged = [...uniqueNew, ...validNews].slice(0, 100);
        
        persistNews(merged);
        
        return {
          ...prev,
          news: merged,
          lastCheck: new Date(),
          isLoading: false,
          secondsUntilRefresh: prev.refreshInterval * 60,
        };
      });

      const newCount = newNewsItems.filter(n => n.isNew).length;
      if (newCount > 0) {
        console.log(`[NewsMonitor] Found ${newCount} new news items`);
      }

      return newNewsItems;
    } catch (error: any) {
      console.error('[NewsMonitor] Error fetching news:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch news',
      }));
      return [];
    }
  }, [persistNews, activeFilters]);

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    console.log(`[NewsMonitor] Starting ${state.refreshInterval}-minute monitoring...`);
    setState(prev => ({ 
      ...prev, 
      isMonitoring: true,
      secondsUntilRefresh: prev.refreshInterval * 60 
    }));
    
    fetchLatestNews();
    
    intervalRef.current = setInterval(() => {
      fetchLatestNews();
    }, state.refreshInterval * 60 * 1000);
    
    countdownRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        secondsUntilRefresh: Math.max(0, prev.secondsUntilRefresh - 1)
      }));
    }, 1000);
  }, [fetchLatestNews, state.refreshInterval]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setState(prev => ({ ...prev, isMonitoring: false }));
    console.log('[NewsMonitor] Monitoring stopped');
  }, []);

  const markAsRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      news: prev.news.map(n => n.id === id ? { ...n, isNew: false } : n),
    }));
  }, []);

  const refreshNews = useCallback(async () => {
    return fetchLatestNews(activeFilters);
  }, [fetchLatestNews, activeFilters]);

  const clearAllNews = useCallback(() => {
    setState(prev => ({ ...prev, news: [] }));
    seenNewsIds.current.clear();
    localStorage.removeItem(NEWS_STORAGE_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    refreshNews,
    markAsRead,
    clearAllNews,
    setRefreshInterval,
    updateFilters,
  };
}

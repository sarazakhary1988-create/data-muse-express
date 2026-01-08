import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateUrl, OFFICIAL_DOMAINS, VERIFIED_DOMAINS, PREMIUM_DOMAINS } from '@/lib/urlValidator';

// Extended categories for lead generation - CMA now has dedicated category
export type NewsCategory = 
  | 'ipo' 
  | 'market' 
  | 'regulatory' 
  | 'expansion' 
  | 'contract' 
  | 'joint_venture' 
  | 'acquisition' 
  | 'appointment' 
  | 'cma'  // NEW: Dedicated CMA category for ALL CMA news
  | 'cma_violation'
  | 'vision_2030'
  | 'banking'
  | 'real_estate'
  | 'tech_funding'
  | 'general';

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

// Official sources for higher trust - CMA domains added
const OFFICIAL_SOURCES = [
  'tadawul', 'saudiexchange', 'cma.org.sa', 'cma.gov.sa', 'argaam', 'zawya',
  'sec.gov', 'nasdaq', 'nyse', 'lseg', 'londonstockexchange',
  'reuters', 'bloomberg', 'ft.com', 'wsj.com', 'yahoo', 'sama.gov.sa', 'mof.gov.sa'
];

// Country detection patterns
const COUNTRY_PATTERNS: Record<string, RegExp> = {
  'Saudi Arabia': /\b(saudi|ksa|riyadh|jeddah|tadawul|aramco|sabic|stc)\b/i,
  'UAE': /\b(uae|dubai|abu dhabi|emirates|adx|dfm)\b/i,
  'Kuwait': /\b(kuwait|boursa)\b/i,
  'Qatar': /\b(qatar|doha|qse)\b/i,
  'Bahrain': /\b(bahrain|manama)\b/i,
  'Oman': /\b(oman|muscat|msm)\b/i,
  'Egypt': /\b(egypt|cairo|egx)\b/i,
  'USA': /\b(usa|us|nasdaq|nyse|american|sec)\b/i,
  'UK': /\b(uk|britain|london|lse|ftse)\b/i,
};

const REGION_MAP: Record<string, NewsRegion> = {
  'Saudi Arabia': 'mena', 'UAE': 'mena', 'Kuwait': 'mena', 'Qatar': 'mena',
  'Bahrain': 'mena', 'Oman': 'mena', 'Egypt': 'mena',
  'USA': 'americas', 'UK': 'europe',
};

// GCC-focused news queries
const GCC_NEWS_QUERIES = [
  'IPO listing Saudi Arabia Tadawul NOMU CMA',
  'M&A acquisition merger MENA GCC Saudi Arabia',
  'CMA violation fine Saudi Arabia financial',
  'CEO CFO chairman director Saudi Arabia UAE appointment',
  'real estate development Saudi Arabia UAE Kuwait NEOM',
  'banking sector profit earnings Gulf region GCC',
  'technology startup funding Saudi Arabia UAE',
  'Vision 2030 project update Saudi Arabia',
  'contract awarded construction Saudi Arabia',
  'Aramco SABIC ACWA Power STC company news',
];

export interface NewsFilters {
  categories?: string[];
  countries?: string[];
  sources?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

// MANUS 1.7 MAX - Category-specific keyword mapping
// Each category uses specific keyword-tuned queries (NOT generic)
// CMA now has dedicated category separate from cma_violation
const MANUS_CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Dedicated CMA category - ALL CMA news (not just violations)
  cma: ['CMA', 'Capital Market Authority', 'هيئة السوق المالية', 'cma.org.sa', 'cma.gov.sa', 'CMA announcement', 'CMA regulation', 'CMA approval', 'CMA license'],
  cma_violation: ['CMA violation', 'CMA fine', 'Capital Market Authority penalty', 'CMA suspension', 'CMA warning', 'CMA enforcement'],
  ipo: ['IPO', 'initial public offering', 'listing', 'prospectus', 'public float', 'stock debut', 'goes public', 'IPO filing'],
  acquisition: ['merger', 'acquisition', 'M&A', 'buyout', 'takeover', 'deal closed', 'acquiring company'],
  banking: ['banking sector', 'bank profit', 'bank earnings', 'SNB', 'Al Rajhi Bank', 'banking services', 'loan growth', 'bank assets'],
  real_estate: ['real estate', 'property development', 'construction project', 'housing', 'commercial property', 'ROSHN', 'property market', 'real estate investment'],
  tech_funding: ['technology startup', 'fintech', 'venture capital', 'series A', 'series B', 'tech investment', 'software company', 'startup funding'],
  vision_2030: ['Vision 2030', 'Saudi Vision 2030', 'NEOM', 'giga project', 'Qiddiya', 'Red Sea Project', 'Diriyah', 'THE LINE'],
  expansion: ['expansion', 'new opening', 'launch', 'new branch', 'entering market', 'growth plan', 'new facility', 'market expansion'],
  contract: ['contract awarded', 'billion deal', 'agreement signed', 'project contract', 'tender won', 'SAR million contract'],
  joint_venture: ['joint venture', 'JV partnership', 'MOU signed', 'strategic alliance', 'business partnership'],
  appointment: ['CEO appointed', 'chairman named', 'executive hire', 'board member appointed', 'CFO announcement', 'director named'],
  regulatory: ['regulation', 'compliance', 'regulatory filing', 'SEC filing', 'CMA announcement', 'regulatory approval'],
  market: ['stock market', 'trading update', 'index movement', 'market cap', 'shares trading', 'equity market', 'TASI'],
};

// Build search queries based on filters - MANUS KEYWORD-SPECIFIC FILTERING
function buildFilteredQueries(filters?: NewsFilters): string[] {
  const queries: string[] = [];
  const activeCountries = filters?.countries?.filter(c => c !== 'all') || [];
  const activeCategories = filters?.categories?.filter(c => c !== 'all') || [];
  const activeSources = filters?.sources?.filter(s => s !== 'all') || [];
  
  // Source-to-site mapping for search
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

  // Build source site string
  const siteStr = activeSources.length > 0
    ? activeSources.map(s => sourceToSite[s] || '').filter(Boolean).join(' OR ')
    : '';

  // MANUS KEYWORD-SPECIFIC: If categories are active, use ONLY category-specific keywords
  if (activeCategories.length > 0) {
    activeCategories.forEach(category => {
      const keywords = MANUS_CATEGORY_KEYWORDS[category];
      if (keywords && keywords.length > 0) {
        // Use first 3 keywords for focused search
        const keywordQuery = keywords.slice(0, 3).join(' OR ');
        
        if (activeCountries.length > 0) {
          activeCountries.forEach(country => {
            queries.push(`(${keywordQuery}) ${country}${siteStr ? ' ' + siteStr : ''}`);
          });
        } else {
          // Default to MENA/GCC region
          queries.push(`(${keywordQuery}) Saudi Arabia GCC${siteStr ? ' ' + siteStr : ''}`);
          queries.push(`(${keywordQuery}) MENA${siteStr ? ' ' + siteStr : ''}`);
        }
      }
    });
  }
  // Countries only - use general financial news for those countries
  else if (activeCountries.length > 0) {
    activeCountries.forEach(country => {
      queries.push(`financial news ${country}${siteStr ? ' ' + siteStr : ''}`);
      queries.push(`business market ${country}${siteStr ? ' ' + siteStr : ''}`);
      queries.push(`stock exchange ${country}${siteStr ? ' ' + siteStr : ''}`);
    });
  }
  // Sources only
  else if (activeSources.length > 0) {
    queries.push(`financial news GCC ${siteStr}`);
    queries.push(`business Saudi Arabia UAE ${siteStr}`);
    queries.push(`market update MENA ${siteStr}`);
  }
  // No filters - use base GCC queries
  else {
    return [...GCC_NEWS_QUERIES].slice(0, 5);
  }

  // Log constructed queries for debugging
  console.log('[NewsMonitor] MANUS keyword-specific queries:', queries);
  
  // Limit to 10 unique queries
  return [...new Set(queries)].slice(0, 10);
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

  // MANUS URL VALIDATION - Uses whitelist and validation system
  const isValidNewsUrl = (url: string): boolean => {
    if (!url || !url.startsWith('http')) return false;
    
    // Use the comprehensive URL validator
    const validation = validateUrl(url);
    
    // Reject if URL structure is invalid or suspicious
    if (!validation.hasValidStructure || validation.isSuspicious) {
      console.log('[NewsMonitor] URL validation failed:', url, validation.reasons);
      return false;
    }
    
    // Accept whitelisted domains and allow unverified for now (with warning badge)
    return validation.isValid;
  };
  
  // Determine source credibility for badges
  const getSourceCredibility = (url: string, source: string): { isOfficial: boolean; isVerified: boolean; isPremium: boolean } => {
    const validation = validateUrl(url);
    const domain = validation.domain.toLowerCase();
    
    return {
      isOfficial: OFFICIAL_DOMAINS.some(d => domain.includes(d)) || 
                  ['cma', 'tadawul', 'saudiexchange', 'sec'].some(s => source.toLowerCase().includes(s)),
      isVerified: VERIFIED_DOMAINS.some(d => domain.includes(d)) ||
                  ['reuters', 'bloomberg', 'bbc', 'aljazeera', 'cnbc'].some(s => source.toLowerCase().includes(s)),
      isPremium: PREMIUM_DOMAINS.some(d => domain.includes(d)) ||
                 ['ft', 'financial times', 'bloomberg', 'wsj', 'economist'].some(s => source.toLowerCase().includes(s)),
    };
  };

  // Filter news by date range - default to last 7 days
  const isWithinDateRange = (timestamp: Date, dateFrom?: Date, dateTo?: Date): boolean => {
    const now = new Date();
    
    // If no date range specified, default to last 7 days
    if (!dateFrom && !dateTo) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return timestamp >= sevenDaysAgo && timestamp <= now;
    }
    
    // Check custom date range
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

  // Update filters for next fetch
  const updateFilters = useCallback((filters: NewsFilters) => {
    setActiveFilters(filters);
  }, []);

  const fetchLatestNews = useCallback(async (filters?: NewsFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Use passed filters or stored activeFilters
    const currentFilters = filters || activeFilters;
    
    try {
      const queries = buildFilteredQueries(currentFilters);
      console.log('[NewsMonitor] Fetching with queries:', queries);
      
      const allResults: any[] = [];
      
      // Fetch in parallel batches using filtered queries
      const batchSize = 3;
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(query => 
            supabase.functions.invoke('wide-research', {
              body: { query, maxResults: 15, newsMode: true },
            })
          )
        );
        
        results.forEach(({ data }) => {
          const searchResults = data?.searchResults || data?.results || [];
          allResults.push(...searchResults);
        });
      }

      console.log('[NewsMonitor] Got total results:', allResults.length);
      
      // Transform, validate and deduplicate
      const urlSet = new Set<string>();
      const newNewsItems: NewsItem[] = allResults
        .filter((result: any) => {
          if (!result.title || !result.url) return false;
          // Validate URL is real
          if (!isValidNewsUrl(result.url)) {
            console.log('[NewsMonitor] Rejecting invalid URL:', result.url);
            return false;
          }
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

          // Parse published timestamp
          const tsCandidate = result.fetchedAt || result.publishDate || result.publishedAt;
          const parsedTs = tsCandidate ? new Date(tsCandidate) : new Date();
          const timestamp = Number.isNaN(parsedTs.getTime()) ? new Date() : parsedTs;
          
          // Get credibility information using MANUS validation
          const credibility = getSourceCredibility(result.url, source);

          return {
            id,
            title: result.title,
            source,
            url: result.url,
            timestamp,
            category: categorizeNews(result.title, snippet),
            isNew,
            snippet: snippet.slice(0, 200) || '',
            country,
            region: country ? REGION_MAP[country] : 'global',
            companies: extractCompanies(text),
            isOfficial: credibility.isOfficial,
            isValidated: credibility.isVerified || credibility.isOfficial,
          };
        })
        // Filter by date range (last 7 days default, or custom range)
        .filter((item: NewsItem) => isWithinDateRange(item.timestamp, currentFilters?.dateFrom, currentFilters?.dateTo));

      setState(prev => {
        const existingIds = new Set(prev.news.map(n => n.id));
        const uniqueNew = newNewsItems.filter(n => !existingIds.has(n.id));
        // Keep news within date range when merging
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
        console.log(`[NewsMonitor] Found ${newCount} new news items within date range`);
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
    
    // Set up refresh interval
    intervalRef.current = setInterval(() => {
      console.log('[NewsMonitor] Auto-refresh triggered');
      fetchLatestNews();
    }, state.refreshInterval * 60 * 1000);

    // Set up countdown timer (update every second)
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
    setState(prev => ({ ...prev, isMonitoring: false, secondsUntilRefresh: 0 }));
    console.log('[NewsMonitor] Monitoring stopped');
  }, []);

  // Restart monitoring when refresh interval changes
  useEffect(() => {
    if (state.isMonitoring) {
      stopMonitoring();
      // Small delay before restarting
      const timeout = setTimeout(() => {
        startMonitoring();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [state.refreshInterval]);

  const markAsRead = useCallback((newsId: string) => {
    setState(prev => ({
      ...prev,
      news: prev.news.map(n => 
        n.id === newsId ? { ...n, isNew: false } : n
      ),
    }));
  }, []);

  const clearAllNews = useCallback(() => {
    setState(prev => ({ ...prev, news: [] }));
    seenNewsIds.current.clear();
    localStorage.removeItem(NEWS_STORAGE_KEY);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Wrapper for click handlers that don't pass filters
  const refreshNews = useCallback(() => {
    fetchLatestNews();
  }, [fetchLatestNews]);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    fetchLatestNews,
    refreshNews,
    markAsRead,
    clearAllNews,
    setRefreshInterval,
    updateFilters,
  };
}

// Helper functions
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}

function detectCountry(text: string): string | undefined {
  for (const [country, pattern] of Object.entries(COUNTRY_PATTERNS)) {
    if (pattern.test(text)) {
      return country;
    }
  }
  return undefined;
}

function extractCompanies(text: string): string[] {
  const companies: string[] = [];
  const knownCompanies = [
    'Aramco', 'SABIC', 'STC', 'Al Rajhi', 'ACWA Power', 'SNB', 'Ma\'aden',
    'Almarai', 'Jarir', 'SACO', 'Mobily', 'Zain', 'Emaar', 'ADNOC'
  ];
  
  for (const company of knownCompanies) {
    if (text.toLowerCase().includes(company.toLowerCase())) {
      companies.push(company);
    }
  }
  
  return companies.slice(0, 3);
}

function categorizeNews(title: string, snippet: string): NewsCategory {
  const text = `${title} ${snippet}`.toLowerCase();
  
  // CMA Violation (specific case - check first)
  if (/\b(cma|capital market authority)\b/i.test(text) && 
      /\b(violation|fine|penalty|sanction|breach|warning|suspend)\b/i.test(text)) {
    return 'cma_violation';
  }
  
  // CMA General (any CMA news from official domains or with CMA keywords)
  if (/\b(cma|capital market authority|هيئة السوق المالية)\b/i.test(text) ||
      /cma\.org\.sa|cma\.gov\.sa/i.test(text)) {
    return 'cma';
  }
  
  if (/\b(vision 2030|giga.?project|neom|the line|qiddiya|red sea|diriyah|amaala)\b/i.test(text)) {
    return 'vision_2030';
  }
  
  if (/\b(startup|fintech|tech|venture|seed|series [a-d]|funding round|raises?|raised)\b/i.test(text) && 
      /\b(million|billion|funding|investment|investor)\b/i.test(text)) {
    return 'tech_funding';
  }
  
  if (/\b(real estate|property|housing|residential|commercial property|roshn|reit|land)\b/i.test(text)) {
    return 'real_estate';
  }
  
  if (/\b(bank|banking|snb|al rajhi|samba|riyad bank|alinma|bsf|sab|ncb)\b/i.test(text) && 
      /\b(profit|earnings|loan|deposit|asset|branch|digital|merger)\b/i.test(text)) {
    return 'banking';
  }
  
  if (/\b(acqui|merger|m&a|buyout|takeover)\b/i.test(text)) {
    return 'acquisition';
  }
  if (/\b(joint venture|partnership|jv|strategic alliance|mou|memorandum)\b/i.test(text)) {
    return 'joint_venture';
  }
  if (/\b(contract|award|won|signed|deal|agreement|billion|million)\b/i.test(text) && 
      /\b(sar|usd|aed|project|construction|supply)\b/i.test(text)) {
    return 'contract';
  }
  if (/\b(appoint|ceo|chairman|cfo|director|executive|join|hire|named)\b/i.test(text)) {
    return 'appointment';
  }
  if (/\b(expand|expansion|launch|open|new branch|new office|entering|growth)\b/i.test(text)) {
    return 'expansion';
  }
  
  if (/\b(ipo|listing|debut|goes public|prospectus|float)\b/i.test(text)) {
    return 'ipo';
  }
  if (/\b(regulation|sec|cma|filing|compliance|law|rule)\b/i.test(text)) {
    return 'regulatory';
  }
  if (/\b(market|stock|index|trading|shares|equity)\b/i.test(text)) {
    return 'market';
  }
  
  return 'general';
}

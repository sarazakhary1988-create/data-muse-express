import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extended categories for lead generation
export type NewsCategory = 
  | 'ipo' 
  | 'market' 
  | 'regulatory' 
  | 'expansion' 
  | 'contract' 
  | 'joint_venture' 
  | 'acquisition' 
  | 'appointment' 
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

// Official sources for higher trust
const OFFICIAL_SOURCES = [
  'tadawul', 'saudiexchange', 'cma.org.sa', 'argaam', 'zawya',
  'sec.gov', 'nasdaq', 'nyse', 'lseg', 'londonstockexchange',
  'reuters', 'bloomberg', 'ft.com', 'wsj.com', 'yahoo'
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
}

// Build search queries based on filters
function buildFilteredQueries(filters?: NewsFilters): string[] {
  const baseQueries = [...GCC_NEWS_QUERIES];
  
  if (!filters) return baseQueries;
  
  const queries: string[] = [];
  const activeCountries = filters.countries?.filter(c => c !== 'all') || [];
  const activeCategories = filters.categories?.filter(c => c !== 'all') || [];
  const activeSources = filters.sources?.filter(s => s !== 'all') || [];
  
  // No filters active = use base queries
  if (activeCountries.length === 0 && activeCategories.length === 0 && activeSources.length === 0) {
    return baseQueries;
  }

  // Category-to-query mapping
  const categoryQueryMap: Record<string, string> = {
    ipo: 'IPO listing prospectus public offering Tadawul NOMU CMA',
    acquisition: 'M&A merger acquisition takeover buyout deal',
    market: 'stock market trading index shares equity Tadawul',
    regulatory: 'CMA SEC regulation compliance filing penalty',
    expansion: 'expansion launch growth new branch office opening',
    contract: 'contract awarded deal agreement billion million SAR project',
    joint_venture: 'joint venture partnership MOU strategic alliance',
    appointment: 'CEO CFO chairman director appointment executive hire',
    cma_violation: 'CMA violation fine penalty sanction breach warning',
    vision_2030: 'Vision 2030 NEOM Red Sea Qiddiya giga project',
    banking: 'banking bank SNB Al Rajhi Riyad Bank profit earnings',
    real_estate: 'real estate property ROSHN REIT development housing',
    tech_funding: 'startup fintech venture funding series investment tech',
  };

  // Source-to-site mapping for search
  const sourceToSite: Record<string, string> = {
    argaam: 'site:argaam.com',
    zawya: 'site:zawya.com',
    reuters: 'site:reuters.com',
    bloomberg: 'site:bloomberg.com',
    arabnews: 'site:arabnews.com',
    ft: 'site:ft.com',
    yahoo: 'site:finance.yahoo.com',
    tadawul: 'site:saudiexchange.sa',
  };

  // Build country string
  const countryStr = activeCountries.length > 0 
    ? activeCountries.join(' OR ') 
    : '';

  // Build source site string
  const siteStr = activeSources.length > 0
    ? activeSources.map(s => sourceToSite[s] || '').filter(Boolean).join(' OR ')
    : '';

  // Case 1: Countries + Categories
  if (activeCountries.length > 0 && activeCategories.length > 0) {
    activeCategories.forEach(cat => {
      const catQuery = categoryQueryMap[cat] || cat;
      activeCountries.forEach(country => {
        queries.push(`${catQuery} ${country}${siteStr ? ' ' + siteStr : ''}`);
      });
    });
  }
  // Case 2: Countries only
  else if (activeCountries.length > 0) {
    activeCountries.forEach(country => {
      queries.push(`financial news ${country}${siteStr ? ' ' + siteStr : ''}`);
      queries.push(`business market ${country}${siteStr ? ' ' + siteStr : ''}`);
      queries.push(`IPO listing ${country}${siteStr ? ' ' + siteStr : ''}`);
      queries.push(`M&A acquisition ${country}${siteStr ? ' ' + siteStr : ''}`);
    });
  }
  // Case 3: Categories only
  else if (activeCategories.length > 0) {
    activeCategories.forEach(cat => {
      const catQuery = categoryQueryMap[cat] || cat;
      queries.push(`${catQuery} GCC MENA${siteStr ? ' ' + siteStr : ''}`);
    });
  }
  // Case 4: Sources only
  else if (activeSources.length > 0) {
    queries.push(`financial news GCC ${siteStr}`);
    queries.push(`business Saudi Arabia UAE ${siteStr}`);
  }

  // Log constructed queries for debugging
  console.log('[NewsMonitor] Built filtered queries:', queries);
  
  // Ensure we have at least some queries, limit to 10
  return queries.length > 0 ? [...new Set(queries)].slice(0, 10) : baseQueries.slice(0, 5);
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

  // Validate URL is real (not AI-generated)
  const isValidNewsUrl = (url: string): boolean => {
    if (!url || !url.startsWith('http')) return false;
    // Reject obviously fake/generated URLs
    if (url.includes('source-') && url.includes('.com')) return false;
    if (url.includes('example.com')) return false;
    if (url.includes('placeholder')) return false;
    // Must have a proper domain structure
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('.') && urlObj.hostname.length > 3;
    } catch {
      return false;
    }
  };

  // Filter for today's news only
  const isFromToday = (timestamp: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return timestamp >= today;
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
            isOfficial: OFFICIAL_SOURCES.some(s => source.toLowerCase().includes(s)),
            isValidated: true,
          };
        })
        // Filter for today's news only
        .filter((item: NewsItem) => isFromToday(item.timestamp));

      setState(prev => {
        const existingIds = new Set(prev.news.map(n => n.id));
        const uniqueNew = newNewsItems.filter(n => !existingIds.has(n.id));
        // Keep today's news only when merging
        const todayNews = prev.news.filter(n => isFromToday(n.timestamp));
        const merged = [...uniqueNew, ...todayNews].slice(0, 100);
        
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
        console.log(`[NewsMonitor] Found ${newCount} new news items from today`);
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
  
  if (/\b(cma|capital market authority)\b/i.test(text) && 
      /\b(violation|fine|penalty|sanction|breach|warning|suspend)\b/i.test(text)) {
    return 'cma_violation';
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

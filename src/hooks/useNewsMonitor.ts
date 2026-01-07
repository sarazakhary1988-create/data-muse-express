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
  isOfficial?: boolean; // From official exchange/regulator
}

interface NewsMonitorState {
  news: NewsItem[];
  isMonitoring: boolean;
  lastCheck: Date | null;
  isLoading: boolean;
  error: string | null;
}

const NEWS_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const NEWS_STORAGE_KEY = 'orkestra_monitored_news';
const LAST_CHECK_KEY = 'orkestra_last_news_check';

// Official sources for higher trust
const OFFICIAL_SOURCES = [
  'tadawul', 'saudiexchange', 'cma.org.sa', 'argaam', 'zawya',
  'sec.gov', 'nasdaq', 'nyse', 'lseg', 'londonstockexchange',
  'reuters', 'bloomberg', 'ft.com', 'wsj.com'
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

export function useNewsMonitor() {
  const [state, setState] = useState<NewsMonitorState>({
    news: [],
    isMonitoring: false,
    lastCheck: null,
    isLoading: false,
    error: null,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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

  const fetchLatestNews = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('[NewsMonitor] Fetching business news...');
      
      // Multiple queries for different news categories
      const queries = [
        'IPO announcements latest filings 2025 2026 Tadawul CMA',
        'Saudi Arabia business expansion news contract award',
        'MENA joint venture partnership announcement',
        'company acquisition merger Saudi UAE',
        'executive appointment CEO chairman Saudi Arabia',
        'Aramco SABIC STC news announcement',
        'CMA violation fine penalty Saudi Arabia regulatory',
        'Vision 2030 Saudi initiative government project',
        'Saudi Arabia banking sector SNB Al Rajhi update',
        'Saudi Arabia real estate property market ROSHN NEOM',
        'Saudi Arabia tech startup funding investment fintech',
      ];
      
      const allResults: any[] = [];
      
      // Fetch in parallel batches
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
      
      // Transform and deduplicate
      const urlSet = new Set<string>();
      const newNewsItems: NewsItem[] = allResults
        .filter((result: any) => {
          if (!result.title || !result.url) return false;
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
          
          const source = extractDomain(result.url);
          const text = `${result.title} ${result.snippet || ''}`;
          const country = detectCountry(text);
          
          return {
            id,
            title: result.title,
            source,
            url: result.url,
            timestamp: new Date(),
            category: categorizeNews(result.title, result.snippet || ''),
            isNew,
            snippet: result.snippet?.slice(0, 200) || '',
            country,
            region: country ? REGION_MAP[country] : 'global',
            companies: extractCompanies(text),
            isOfficial: OFFICIAL_SOURCES.some(s => source.toLowerCase().includes(s)),
          };
        });

      setState(prev => {
        const existingIds = new Set(prev.news.map(n => n.id));
        const uniqueNew = newNewsItems.filter(n => !existingIds.has(n.id));
        const merged = [...uniqueNew, ...prev.news].slice(0, 100);
        
        persistNews(merged);
        
        return {
          ...prev,
          news: merged,
          lastCheck: new Date(),
          isLoading: false,
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
  }, [persistNews]);

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    console.log('[NewsMonitor] Starting hourly monitoring...');
    setState(prev => ({ ...prev, isMonitoring: true }));
    
    fetchLatestNews();
    
    intervalRef.current = setInterval(() => {
      console.log('[NewsMonitor] Hourly check triggered');
      fetchLatestNews();
    }, NEWS_CHECK_INTERVAL);
  }, [fetchLatestNews]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isMonitoring: false }));
    console.log('[NewsMonitor] Monitoring stopped');
  }, []);

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
    };
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    fetchLatestNews,
    markAsRead,
    clearAllNews,
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
  
  // CMA violations/fines (high priority)
  if (/\b(cma|capital market authority)\b/i.test(text) && 
      /\b(violation|fine|penalty|sanction|breach|warning|suspend)\b/i.test(text)) {
    return 'cma_violation';
  }
  
  // Vision 2030 initiatives
  if (/\b(vision 2030|giga.?project|neom|the line|qiddiya|red sea|diriyah|amaala)\b/i.test(text)) {
    return 'vision_2030';
  }
  
  // Tech startup funding
  if (/\b(startup|fintech|tech|venture|seed|series [a-d]|funding round|raises?|raised)\b/i.test(text) && 
      /\b(million|billion|funding|investment|investor)\b/i.test(text)) {
    return 'tech_funding';
  }
  
  // Real estate market
  if (/\b(real estate|property|housing|residential|commercial property|roshn|reit|land)\b/i.test(text)) {
    return 'real_estate';
  }
  
  // Banking sector
  if (/\b(bank|banking|snb|al rajhi|samba|riyad bank|alinma|bsf|sab|ncb)\b/i.test(text) && 
      /\b(profit|earnings|loan|deposit|asset|branch|digital|merger)\b/i.test(text)) {
    return 'banking';
  }
  
  // Lead-gen categories
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
  
  // Standard categories
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

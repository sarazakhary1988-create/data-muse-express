import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: Date;
  category: 'ipo' | 'market' | 'regulatory' | 'general';
  isNew: boolean;
}

interface NewsMonitorState {
  news: NewsItem[];
  isMonitoring: boolean;
  lastCheck: Date | null;
  isLoading: boolean;
  error: string | null;
}

const NEWS_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const NEWS_STORAGE_KEY = 'orkestra_monitored_news';
const LAST_CHECK_KEY = 'orkestra_last_news_check';

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
        // Mark all as not new since they're from storage
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

  // Persist news to localStorage
  const persistNews = useCallback((news: NewsItem[]) => {
    try {
      // Keep only last 50 news items
      const toStore = news.slice(0, 50);
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(toStore));
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    } catch (e) {
      console.error('Failed to persist news:', e);
    }
  }, []);

  const fetchLatestNews = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('[NewsMonitor] Fetching latest IPO news...');
      
      // Call the wide-research function with a focused IPO query
      const { data, error } = await supabase.functions.invoke('wide-research', {
        body: {
          query: 'IPO announcements news today latest filings 2025 2026',
          maxResults: 20,
          newsMode: true,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const searchResults = data?.searchResults || data?.results || [];
      console.log('[NewsMonitor] Got search results:', searchResults.length);
      
      // Transform search results into news items
      const newNewsItems: NewsItem[] = searchResults
        .filter((result: any) => result.title && result.url)
        .map((result: any) => {
          const id = `news_${btoa(result.url).slice(0, 20)}`;
          const isNew = !seenNewsIds.current.has(id);
          
          if (isNew) {
            seenNewsIds.current.add(id);
          }
          
          return {
            id,
            title: result.title,
            source: extractDomain(result.url),
            url: result.url,
            timestamp: new Date(),
            category: categorizeNews(result.title, result.snippet || ''),
            isNew,
          };
        });

      setState(prev => {
        // Merge new items, avoiding duplicates
        const existingIds = new Set(prev.news.map(n => n.id));
        const uniqueNew = newNewsItems.filter(n => !existingIds.has(n.id));
        const merged = [...uniqueNew, ...prev.news].slice(0, 50);
        
        persistNews(merged);
        
        return {
          ...prev,
          news: merged,
          lastCheck: new Date(),
          isLoading: false,
        };
      });

      // Show notification for new items
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
    
    // Fetch immediately
    fetchLatestNews();
    
    // Set up hourly interval
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

  // Cleanup on unmount
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

function categorizeNews(title: string, snippet: string): NewsItem['category'] {
  const text = `${title} ${snippet}`.toLowerCase();
  
  if (text.includes('ipo') || text.includes('listing') || text.includes('debut') || text.includes('goes public')) {
    return 'ipo';
  }
  if (text.includes('regulation') || text.includes('sec') || text.includes('cma') || text.includes('filing')) {
    return 'regulatory';
  }
  if (text.includes('market') || text.includes('stock') || text.includes('index') || text.includes('trading')) {
    return 'market';
  }
  return 'general';
}

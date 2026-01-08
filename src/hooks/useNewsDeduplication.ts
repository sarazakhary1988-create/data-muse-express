import { useState, useCallback, useMemo } from 'react';
import { NewsItem } from '@/hooks/useNewsMonitor';

export interface DeduplicationSettings {
  enabled: boolean;
  similarityThreshold: number; // 0-1, higher = stricter matching
  preferredSources: string[]; // Priority order for source preference
}

const DEDUP_SETTINGS_KEY = 'orkestra_news_deduplication';

const DEFAULT_SETTINGS: DeduplicationSettings = {
  enabled: true,
  similarityThreshold: 0.7,
  preferredSources: [
    'cma.org.sa', 'tadawul', 'saudiexchange', 'argaam', 'zawya',
    'reuters', 'bloomberg', 'ft', 'wsj', 'yahoo'
  ],
};

// Simple word-based similarity (Jaccard-like)
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

// Get source authority score (higher = more authoritative)
function getSourceAuthority(source: string, preferredSources: string[]): number {
  const lowerSource = source.toLowerCase();
  const index = preferredSources.findIndex(s => lowerSource.includes(s.toLowerCase()));
  if (index === -1) return 0;
  return preferredSources.length - index;
}

export function useNewsDeduplication() {
  const [settings, setSettings] = useState<DeduplicationSettings>(() => {
    try {
      const stored = localStorage.getItem(DEDUP_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((updates: Partial<DeduplicationSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      try {
        localStorage.setItem(DEDUP_SETTINGS_KEY, JSON.stringify(newSettings));
      } catch {}
      return newSettings;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  const setThreshold = useCallback((threshold: number) => {
    updateSettings({ similarityThreshold: Math.max(0, Math.min(1, threshold)) });
  }, [updateSettings]);

  const addPreferredSource = useCallback((source: string) => {
    if (!source.trim()) return;
    const normalized = source.trim().toLowerCase();
    if (!settings.preferredSources.includes(normalized)) {
      updateSettings({ preferredSources: [normalized, ...settings.preferredSources] });
    }
  }, [settings.preferredSources, updateSettings]);

  const removePreferredSource = useCallback((source: string) => {
    updateSettings({ 
      preferredSources: settings.preferredSources.filter(s => s !== source) 
    });
  }, [settings.preferredSources, updateSettings]);

  const reorderPreferredSource = useCallback((source: string, direction: 'up' | 'down') => {
    const idx = settings.preferredSources.indexOf(source);
    if (idx === -1) return;
    
    const newList = [...settings.preferredSources];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
    updateSettings({ preferredSources: newList });
  }, [settings.preferredSources, updateSettings]);

  // Main deduplication function
  const deduplicateNews = useCallback((news: NewsItem[]): NewsItem[] => {
    if (!settings.enabled || news.length === 0) return news;

    const groups: NewsItem[][] = [];
    const assigned = new Set<string>();

    // Group similar articles
    for (const item of news) {
      if (assigned.has(item.id)) continue;

      const group: NewsItem[] = [item];
      assigned.add(item.id);

      for (const other of news) {
        if (assigned.has(other.id)) continue;
        
        // Check title similarity
        const similarity = calculateSimilarity(item.title, other.title);
        
        if (similarity >= settings.similarityThreshold) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    // Pick the best article from each group
    const deduplicated: NewsItem[] = groups.map(group => {
      if (group.length === 1) return group[0];

      // Score each article and pick the best
      const scored = group.map(item => ({
        item,
        score: getSourceAuthority(item.source, settings.preferredSources) * 10 +
               (item.isOfficial ? 50 : 0) +
               (item.snippet ? item.snippet.length / 100 : 0) +
               (item.isNew ? 5 : 0)
      }));

      scored.sort((a, b) => b.score - a.score);
      
      // Add metadata about duplicates
      const best = { ...scored[0].item };
      (best as any).duplicateCount = group.length - 1;
      (best as any).duplicateSources = group.filter(g => g.id !== best.id).map(g => g.source);
      
      return best;
    });

    // Sort by timestamp (newest first)
    return deduplicated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [settings]);

  return {
    settings,
    updateSettings,
    toggleEnabled,
    setThreshold,
    addPreferredSource,
    removePreferredSource,
    reorderPreferredSource,
    deduplicateNews,
  };
}

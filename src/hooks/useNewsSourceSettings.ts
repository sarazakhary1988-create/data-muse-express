import { useState, useEffect, useCallback } from 'react';

export interface NewsSourceSettings {
  mode: 'whitelist' | 'blacklist';
  whitelist: string[];
  blacklist: string[];
}

const NEWS_SOURCE_SETTINGS_KEY = 'orkestra_news_source_settings';

const DEFAULT_SETTINGS: NewsSourceSettings = {
  mode: 'blacklist',
  whitelist: [],
  blacklist: [],
};

export function useNewsSourceSettings() {
  const [settings, setSettings] = useState<NewsSourceSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NEWS_SOURCE_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load news source settings:', e);
    }
  }, []);

  // Persist settings to localStorage
  const persistSettings = useCallback((newSettings: NewsSourceSettings) => {
    try {
      localStorage.setItem(NEWS_SOURCE_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to persist news source settings:', e);
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<NewsSourceSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      persistSettings(newSettings);
      return newSettings;
    });
  }, [persistSettings]);

  const setMode = useCallback((mode: 'whitelist' | 'blacklist') => {
    updateSettings({ mode });
  }, [updateSettings]);

  const addToWhitelist = useCallback((source: string) => {
    const normalized = source.toLowerCase().trim();
    if (!normalized) return;
    
    setSettings(prev => {
      if (prev.whitelist.includes(normalized)) return prev;
      const newSettings = { 
        ...prev, 
        whitelist: [...prev.whitelist, normalized] 
      };
      persistSettings(newSettings);
      return newSettings;
    });
  }, [persistSettings]);

  const removeFromWhitelist = useCallback((source: string) => {
    const normalized = source.toLowerCase().trim();
    setSettings(prev => {
      const newSettings = { 
        ...prev, 
        whitelist: prev.whitelist.filter(s => s !== normalized) 
      };
      persistSettings(newSettings);
      return newSettings;
    });
  }, [persistSettings]);

  const addToBlacklist = useCallback((source: string) => {
    const normalized = source.toLowerCase().trim();
    if (!normalized) return;
    
    setSettings(prev => {
      if (prev.blacklist.includes(normalized)) return prev;
      const newSettings = { 
        ...prev, 
        blacklist: [...prev.blacklist, normalized] 
      };
      persistSettings(newSettings);
      return newSettings;
    });
  }, [persistSettings]);

  const removeFromBlacklist = useCallback((source: string) => {
    const normalized = source.toLowerCase().trim();
    setSettings(prev => {
      const newSettings = { 
        ...prev, 
        blacklist: prev.blacklist.filter(s => s !== normalized) 
      };
      persistSettings(newSettings);
      return newSettings;
    });
  }, [persistSettings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
  }, [persistSettings]);

  // Check if a source should be shown based on current settings
  const isSourceAllowed = useCallback((source: string): boolean => {
    const normalized = source.toLowerCase().trim();
    
    if (settings.mode === 'whitelist') {
      // In whitelist mode, only show if source is in whitelist (or whitelist is empty)
      return settings.whitelist.length === 0 || settings.whitelist.some(s => normalized.includes(s));
    } else {
      // In blacklist mode, show unless source is in blacklist
      return !settings.blacklist.some(s => normalized.includes(s));
    }
  }, [settings]);

  return {
    settings,
    setMode,
    addToWhitelist,
    removeFromWhitelist,
    addToBlacklist,
    removeFromBlacklist,
    resetSettings,
    isSourceAllowed,
  };
}

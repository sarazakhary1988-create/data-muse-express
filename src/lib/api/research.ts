import { supabase } from "@/integrations/supabase/client";

export interface ScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

export interface SearchResult {
  success: boolean;
  data?: Array<{
    url: string;
    title: string;
    description?: string;
    markdown?: string;
  }>;
  error?: string;
}

export interface AnalyzeResult {
  success: boolean;
  result?: string;
  error?: string;
}

export interface MapResult {
  success: boolean;
  links?: string[];
  error?: string;
}

export const researchApi = {
  // Scrape a single URL
  async scrape(
    url: string,
    formats: string[] = ['markdown', 'links'],
    onlyMainContent: boolean = true,
    waitFor: number = 3000
  ): Promise<ScrapeResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-scrape', {
        body: { url, formats, onlyMainContent, waitFor },
      });

      if (error) {
        console.error('Scrape function error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('Scrape error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to scrape' };
    }
  },

  // Search the web for a query
  async search(query: string, limit: number = 12, scrapeContent: boolean = false): Promise<SearchResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { query, limit, scrapeContent, lang: 'en', country: 'SA' },
      });

      if (error) {
        console.error('Search function error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('Search error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to search' };
    }
  },

  // Analyze content with AI
  async analyze(
    query: string, 
    content: string, 
    type: 'summarize' | 'analyze' | 'extract' | 'report' = 'analyze'
  ): Promise<AnalyzeResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-analyze', {
        body: { query, content, type },
      });

      if (error) {
        console.error('Analyze function error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('Analyze error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to analyze' };
    }
  },

  // Map a website to discover URLs
  async map(url: string, search?: string, limit: number = 100): Promise<MapResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-map', {
        body: { url, search, limit },
      });

      if (error) {
        console.error('Map function error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('Map error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to map' };
    }
  },
};

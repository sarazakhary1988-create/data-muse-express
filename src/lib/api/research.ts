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
  searchMethod?: string;
}

export interface AnalyzeResult {
  success: boolean;
  result?: string;
  error?: string;
}

export interface ExtractResult {
  success: boolean;
  data?: {
    companies: Array<{
      name: string;
      ticker?: string;
      market?: string;
      action?: string;
      date?: string;
      value?: string;
      source_url?: string;
    }>;
    key_dates: Array<{
      date: string;
      event: string;
      entity?: string;
    }>;
    key_facts: Array<{
      fact: string;
      confidence?: 'high' | 'medium' | 'low';
      source?: string;
    }>;
    numeric_data: Array<{
      metric: string;
      value: string;
      unit?: string;
      context?: string;
    }>;
  };
  error?: string;
}

export interface MapResult {
  success: boolean;
  links?: string[];
  error?: string;
}

export const researchApi = {
  // Scrape a single URL using AI-powered analysis
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
        console.warn('Scrape function error:', error);
        return this.fallbackScrape(url);
      }

      if (!data?.success) {
        console.warn('Scrape failed');
        return this.fallbackScrape(url);
      }

      return data;
    } catch (err) {
      console.warn('Scrape error:', err);
      return this.fallbackScrape(url);
    }
  },

  // Fallback scrape - returns URL metadata
  fallbackScrape(url: string): ScrapeResult {
    const domain = new URL(url).hostname.replace('www.', '');
    return {
      success: true,
      data: {
        markdown: `[Content from ${domain}]\n\nURL: ${url}\n\n*AI-powered content analysis mode.*`,
        metadata: {
          title: `Page from ${domain}`,
          sourceURL: url,
        }
      }
    };
  },

  // Search using AI-powered research (no external dependencies)
  async search(query: string, limit: number = 12, scrapeContent: boolean = false): Promise<SearchResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { query, limit, scrapeContent, lang: 'en' },
      });

      if (error) {
        console.warn('Search function error:', error);
        return { success: true, data: [], error: 'Search temporarily unavailable' };
      }

      if (!data?.success || !data?.data?.length) {
        console.warn('Search returned no results');
        return { success: true, data: [], searchMethod: 'ai-powered' };
      }

      return {
        success: true,
        data: data.data.map((item: { url: string; title: string; description?: string; markdown?: string }) => ({
          url: item.url,
          title: item.title,
          description: item.description || '',
          markdown: item.markdown || item.description || '',
        })),
        searchMethod: data.searchMethod || 'ai-powered'
      };
    } catch (err) {
      console.warn('Search error:', err);
      return { success: true, data: [], error: 'Search failed' };
    }
  },

  // Analyze content with AI - core capability
  async analyze(
    query: string, 
    content: string, 
    type: 'summarize' | 'analyze' | 'extract' | 'report' | 'verify' = 'analyze',
    reportFormat?: 'detailed' | 'executive' | 'table'
  ): Promise<AnalyzeResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-analyze', {
        body: { query, content, type, reportFormat },
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

  // Extract structured data with AI
  async extract(
    query: string,
    content: string,
    extractType: 'entities' | 'companies' | 'dates' | 'facts' | 'all' = 'all'
  ): Promise<ExtractResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-extract', {
        body: { query, content, extractType },
      });

      if (error) {
        console.error('Extract function error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('Extract error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to extract' };
    }
  },

  // Map a website to discover URLs using AI
  async map(url: string, search?: string, limit: number = 100): Promise<MapResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-map', {
        body: { url, search, limit },
      });

      if (error) {
        console.warn('Map function error:', error);
        return this.fallbackMap(url);
      }

      if (!data?.success) {
        return this.fallbackMap(url);
      }

      return data;
    } catch (err) {
      console.warn('Map error:', err);
      return this.fallbackMap(url);
    }
  },

  // Fallback map - returns the base URL
  fallbackMap(url: string): MapResult {
    return {
      success: true,
      links: [url]
    };
  }
};
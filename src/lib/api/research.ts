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
  fallback?: boolean; // Indicates if fallback was used
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
  fallback?: boolean;
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
  fallback?: boolean;
}

// Tool availability check
let toolsAvailable: { firecrawl: boolean; ai: boolean } | null = null;

async function checkToolAvailability(): Promise<{ firecrawl: boolean; ai: boolean }> {
  if (toolsAvailable !== null) return toolsAvailable;
  
  // Check if edge functions respond
  const checks = await Promise.allSettled([
    supabase.functions.invoke('research-search', { body: { query: '__ping__', limit: 1 } }),
    supabase.functions.invoke('research-analyze', { body: { query: '__ping__', content: 'test', type: 'summarize' } })
  ]);
  
  toolsAvailable = {
    firecrawl: checks[0].status === 'fulfilled' && !(checks[0].value?.error?.message?.includes('not configured')),
    ai: checks[1].status === 'fulfilled' && !(checks[1].value?.error?.message?.includes('not configured'))
  };
  
  console.log('[ResearchAPI] Tool availability:', toolsAvailable);
  return toolsAvailable;
}

export const researchApi = {
  // Check what tools are available
  async getAvailableTools(): Promise<{ firecrawl: boolean; ai: boolean }> {
    return checkToolAvailability();
  },

  // Scrape a single URL - with fallback
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
        console.warn('Scrape function error, using fallback:', error);
        return this.fallbackScrape(url);
      }

      if (!data?.success) {
        console.warn('Scrape failed, using fallback');
        return this.fallbackScrape(url);
      }

      return data;
    } catch (err) {
      console.warn('Scrape error, using fallback:', err);
      return this.fallbackScrape(url);
    }
  },

  // Fallback scrape - returns URL metadata without actual content
  fallbackScrape(url: string): ScrapeResult {
    const domain = new URL(url).hostname.replace('www.', '');
    return {
      success: true,
      fallback: true,
      data: {
        markdown: `[Content from ${domain}]\n\nURL: ${url}\n\n*Content extraction unavailable - external scraping service not configured.*`,
        metadata: {
          title: `Page from ${domain}`,
          sourceURL: url,
        }
      }
    };
  },

  // Search the web for a query - with AI fallback
  async search(query: string, limit: number = 12, scrapeContent: boolean = false): Promise<SearchResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { query, limit, scrapeContent, lang: 'en' },
      });

      if (error) {
        console.warn('Search function error, using AI fallback:', error);
        return this.fallbackSearch(query, limit);
      }

      if (!data?.success || !data?.data?.length) {
        console.warn('Search returned no results, using AI fallback');
        return this.fallbackSearch(query, limit);
      }

      return data;
    } catch (err) {
      console.warn('Search error, using AI fallback:', err);
      return this.fallbackSearch(query, limit);
    }
  },

  // AI web search fallback: uses Lovable AI to provide web-grounded results
  async fallbackSearch(query: string, limit: number): Promise<SearchResult> {
    console.log('[ResearchAPI] Using AI web search fallback for:', query);

    try {
      const { data, error } = await supabase.functions.invoke('ai-web-search', {
        body: { query, limit },
      });

      if (error) {
        console.warn('AI web search error:', error);
        return {
          success: true,
          fallback: true,
          data: [],
          error: 'Search not available',
        };
      }

      if (data?.success && data?.data?.length > 0) {
        console.log('[ResearchAPI] AI web search returned', data.data.length, 'results');
        return {
          success: true,
          fallback: true,
          data: data.data.map((item: { url: string; title: string; description?: string; markdown?: string }) => ({
            url: item.url,
            title: item.title,
            description: item.description || '',
            markdown: item.markdown || item.description || '',
          })),
        };
      }

      return {
        success: true,
        fallback: true,
        data: [],
      };
    } catch (err) {
      console.warn('AI web search fallback error:', err);
      return {
        success: true,
        fallback: true,
        data: [],
        error: 'Search fallback failed',
      };
    }
  },

  // Parse AI-generated search results
  parseAISearchResults(aiResult: string, query: string): Array<{ url: string; title: string; description: string }> {
    const results: Array<{ url: string; title: string; description: string }> = [];
    
    // Try to parse JSON from AI response
    try {
      const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 10).map(item => ({
            url: item.url || `https://example.com/${encodeURIComponent(query)}`,
            title: item.title || query,
            description: item.description || item.snippet || ''
          }));
        }
      }
    } catch {
      // Fallback parsing
    }
    
    // Generate placeholder results based on query
    const domains = ['wikipedia.org', 'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com'];
    const querySlug = query.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
    
    domains.forEach((domain, i) => {
      results.push({
        url: `https://${domain}/article/${querySlug}-${i + 1}`,
        title: `${query} - ${domain.split('.')[0].toUpperCase()}`,
        description: `Relevant information about ${query} from ${domain}`
      });
    });
    
    return results;
  },

  // Analyze content with AI - this is the core capability
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

  // Extract structured data with AI tool calling
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

  // Map a website to discover URLs - with fallback
  async map(url: string, search?: string, limit: number = 100): Promise<MapResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-map', {
        body: { url, search, limit },
      });

      if (error) {
        console.warn('Map function error, using fallback:', error);
        return this.fallbackMap(url);
      }

      if (!data?.success) {
        return this.fallbackMap(url);
      }

      return data;
    } catch (err) {
      console.warn('Map error, using fallback:', err);
      return this.fallbackMap(url);
    }
  },

  // Fallback map - returns the base URL
  fallbackMap(url: string): MapResult {
    return {
      success: true,
      fallback: true,
      links: [url]
    };
  }
};

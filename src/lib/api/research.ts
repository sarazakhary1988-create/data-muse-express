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

export interface SourceStatus {
  name: string;
  baseUrl: string;
  status: 'success' | 'failed' | 'timeout' | 'blocked' | 'no_content';
  pagesFound: number;
  pagesExtracted: number;
  error?: string;
  responseTime?: number;
}

export interface UnreachableSource {
  name: string;
  url: string;
  reason: string;
  responseTime?: number;
}

export interface SearchResult {
  success: boolean;
  data?: Array<{
    url: string;
    title: string;
    description?: string;
    markdown?: string;
    fetchedAt?: string;
    sourceStatus?: string;
  }>;
  error?: string;
  searchMethod?: string;
  strictModeFailure?: boolean;
  sourceStatuses?: SourceStatus[];
  unreachableSources?: UnreachableSource[];
  recommendations?: string[];
  summary?: {
    sourcesChecked: number;
    sourcesReachable: number;
    sourcesUnreachable: number;
    totalPagesFound: number;
    totalPagesExtracted: number;
  };
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

export interface TavilySearchResult {
  success: boolean;
  data?: Array<{
    url: string;
    title: string;
    description?: string;
    markdown?: string;
    score?: number;
    publishedDate?: string;
    fetchedAt?: string;
  }>;
  answer?: string;
  error?: string;
  searchMethod?: string;
  timing?: { total: number };
}

export const researchApi = {
  // Scrape a single URL using direct fetch + extraction
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
        console.warn('Scrape failed:', data?.error);
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
      success: false,
      error: `Could not fetch content from ${domain}`,
      data: {
        markdown: `[Content unavailable from ${domain}]\n\nURL: ${url}\n\n*Direct fetch failed - source may be blocked or unavailable.*`,
        metadata: {
          title: `Page from ${domain}`,
          sourceURL: url,
        }
      }
    };
  },

  // Search with strict mode support
  async search(
    query: string, 
    limit: number = 12, 
    scrapeContent: boolean = false,
    options?: {
      strictMode?: boolean;
      minSources?: number;
      country?: string;
    }
  ): Promise<SearchResult> {
    try {
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { 
          query, 
          limit, 
          scrapeContent, 
          lang: 'en',
          strictMode: options?.strictMode ?? false,
          minSources: options?.minSources ?? 2,
          country: options?.country,
        },
      });

      if (error) {
        console.error('Search function error:', error);
        return { 
          success: false, 
          data: [], 
          error: error.message || 'Search temporarily unavailable' 
        };
      }

      // Handle strict mode failure
      if (data?.strictModeFailure) {
        console.warn('Strict mode failure:', data.error);
        return {
          success: false,
          error: data.error,
          strictModeFailure: true,
          sourceStatuses: data.sourceStatuses,
          unreachableSources: data.unreachableSources,
          recommendations: data.recommendations,
          data: [],
        };
      }

      if (!data?.success) {
        console.warn('Search returned no results:', data?.error);
        return { 
          success: false, 
          data: [], 
          error: data?.error || 'No results found',
          sourceStatuses: data?.sourceStatuses,
        };
      }

      return {
        success: true,
        data: data.data.map((item: { url: string; title: string; description?: string; markdown?: string; fetchedAt?: string }) => ({
          url: item.url,
          title: item.title,
          description: item.description || '',
          markdown: item.markdown || item.description || '',
          fetchedAt: item.fetchedAt,
        })),
        searchMethod: data.searchMethod || 'internal_fetch',
        sourceStatuses: data.sourceStatuses,
        summary: data.summary,
      };
    } catch (err) {
      console.error('Search error:', err);
      return { 
        success: false, 
        data: [], 
        error: err instanceof Error ? err.message : 'Search failed' 
      };
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

  // Map a website to discover URLs
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
  },

  // Tavily-powered web search for broader discovery
  async tavilySearch(
    query: string,
    options?: {
      searchDepth?: 'basic' | 'advanced';
      topic?: 'general' | 'news' | 'finance';
      days?: number;
      maxResults?: number;
      includeAnswer?: boolean;
      includeDomains?: string[];
      excludeDomains?: string[];
    }
  ): Promise<TavilySearchResult> {
    try {
      const { data, error } = await supabase.functions.invoke('tavily-search', {
        body: { 
          query, 
          searchDepth: options?.searchDepth || 'advanced',
          topic: options?.topic || 'general',
          days: options?.days || 30,
          maxResults: options?.maxResults || 10,
          includeAnswer: options?.includeAnswer !== false,
          includeDomains: options?.includeDomains,
          excludeDomains: options?.excludeDomains,
        },
      });

      if (error) {
        console.error('Tavily search error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('Tavily search error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Tavily search failed' };
    }
  },

  // Combined search: Tavily + sitemap discovery
  async hybridSearch(
    query: string,
    options?: {
      useTavily?: boolean;
      useSitemap?: boolean;
      tavilyOptions?: {
        searchDepth?: 'basic' | 'advanced';
        topic?: 'general' | 'news' | 'finance';
        days?: number;
        maxResults?: number;
      };
      sitemapOptions?: {
        limit?: number;
        strictMode?: boolean;
        country?: string;
      };
    }
  ): Promise<SearchResult> {
    const useTavily = options?.useTavily !== false;
    const useSitemap = options?.useSitemap !== false;
    
    const results: SearchResult['data'] = [];
    let tavilyAnswer: string | undefined;
    const errors: string[] = [];

    // Run searches in parallel
    const promises: Promise<void>[] = [];

    if (useTavily) {
      promises.push(
        this.tavilySearch(query, options?.tavilyOptions)
          .then(tavilyResult => {
            if (tavilyResult.success && tavilyResult.data) {
              results.push(...tavilyResult.data.map(r => ({
                url: r.url,
                title: r.title,
                description: r.description || '',
                markdown: r.markdown || r.description || '',
                fetchedAt: r.fetchedAt,
                sourceStatus: 'success' as const,
              })));
              tavilyAnswer = tavilyResult.answer;
            } else if (tavilyResult.error) {
              errors.push(`Tavily: ${tavilyResult.error}`);
            }
          })
          .catch(err => {
            errors.push(`Tavily: ${err.message}`);
          })
      );
    }

    if (useSitemap) {
      promises.push(
        this.search(query, options?.sitemapOptions?.limit || 10, false, {
          strictMode: options?.sitemapOptions?.strictMode,
          country: options?.sitemapOptions?.country,
        })
          .then(sitemapResult => {
            if (sitemapResult.success && sitemapResult.data) {
              results.push(...sitemapResult.data);
            } else if (sitemapResult.error) {
              errors.push(`Sitemap: ${sitemapResult.error}`);
            }
          })
          .catch(err => {
            errors.push(`Sitemap: ${err.message}`);
          })
      );
    }

    await Promise.all(promises);

    // Deduplicate by URL
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.url, r])).values()
    );

    return {
      success: uniqueResults.length > 0,
      data: uniqueResults,
      searchMethod: 'hybrid',
      error: errors.length > 0 && uniqueResults.length === 0 ? errors.join('; ') : undefined,
    };
  }
};
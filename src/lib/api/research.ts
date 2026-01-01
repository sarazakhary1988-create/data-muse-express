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
    id?: string;
    url: string;
    title: string;
    description?: string;
    markdown?: string;
    content?: string;
    fetchedAt?: string;
    sourceStatus?: string;
    reliability?: number;
  }>;
  error?: string;
  searchMethod?: string;
  strictModeFailure?: boolean;
  sourceStatuses?: SourceStatus[];
  unreachableSources?: UnreachableSource[];
  recommendations?: string[];
  timing?: { total: number };
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

// ============ RESEARCH API - NO EXTERNAL DEPENDENCIES ============
// Uses only:
// 1. Tavily (tavily-search) - for web search with TAVILY_API_KEY
// 2. Internal research-search - for sitemap discovery and scraping
// 3. Lovable AI - only for analysis/report generation (via research-analyze)

export const researchApi = {
  // PRIMARY SEARCH: Uses Tavily (configured with TAVILY_API_KEY)
  async search(
    query: string, 
    limit: number = 12, 
    scrapeContent: boolean = false,
    options?: {
      strictMode?: boolean;
      minSources?: number;
      country?: string;
      tbs?: string; // Time filter
    }
  ): Promise<SearchResult> {
    try {
      console.log('[researchApi] Searching with Tavily:', query);
      
      // Use Tavily as primary search engine
      const tavilyResult = await this.tavilySearch(query, {
        maxResults: limit,
        searchDepth: 'advanced',
        topic: 'general',
        days: 30,
      });

      if (tavilyResult.success && tavilyResult.data && tavilyResult.data.length > 0) {
        console.log('[researchApi] Tavily search success:', tavilyResult.data.length, 'results');
        return {
          success: true,
          data: tavilyResult.data.map(item => ({
            id: `tavily-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: item.url,
            title: item.title,
            description: item.description || '',
            markdown: item.markdown || item.description || '',
            content: item.markdown || item.description || '',
            fetchedAt: item.fetchedAt,
            reliability: item.score || 0.8,
          })),
          searchMethod: 'tavily',
          timing: tavilyResult.timing,
        };
      }

      // Fallback to internal research-search if Tavily fails
      console.log('[researchApi] Tavily returned no results, falling back to internal search');
      return this.internalSearch(query, limit, options);
    } catch (err) {
      console.error('[researchApi] Search error:', err);
      return this.internalSearch(query, limit, options);
    }
  },

  // INTERNAL SEARCH: Uses research-search edge function (sitemap discovery + scraping)
  async internalSearch(
    query: string, 
    limit: number = 12, 
    options?: {
      strictMode?: boolean;
      minSources?: number;
      country?: string;
    }
  ): Promise<SearchResult> {
    try {
      console.log('[researchApi] Internal search:', query);
      
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: { 
          query, 
          limit, 
          scrapeContent: false, 
          lang: 'en',
          strictMode: options?.strictMode ?? false,
          minSources: options?.minSources ?? 2,
          country: options?.country,
        },
      });

      if (error) {
        return { success: false, data: [], error: error.message || 'Search temporarily unavailable' };
      }

      if (data?.strictModeFailure) {
        return {
          success: false,
          error: data.error,
          strictModeFailure: true,
          sourceStatuses: data.sourceStatuses,
          unreachableSources: data.unreachableSources,
          data: [],
        };
      }

      if (!data?.success) {
        return { success: false, data: [], error: data?.error || 'No results found' };
      }

      return {
        success: true,
        data: data.data.map((item: any) => ({
          id: item.id || `internal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: item.url,
          title: item.title,
          description: item.description || '',
          markdown: item.markdown || item.description || '',
          content: item.markdown || item.content || item.description || '',
          fetchedAt: item.fetchedAt,
          reliability: item.reliability || 0.7,
        })),
        searchMethod: data.searchMethod || 'internal_fetch',
        sourceStatuses: data.sourceStatuses,
        summary: data.summary,
      };
    } catch (err) {
      return { success: false, data: [], error: err instanceof Error ? err.message : 'Search failed' };
    }
  },

  // SCRAPE: Uses research-scrape edge function
  async scrape(
    url: string,
    formats: string[] = ['markdown', 'links'],
    onlyMainContent: boolean = true,
    waitFor: number = 3000
  ): Promise<ScrapeResult> {
    try {
      console.log('[researchApi] Scraping with research-scrape:', url);
      
      const { data, error } = await supabase.functions.invoke('research-scrape', {
        body: { url, formats, onlyMainContent, waitFor },
      });

      if (error || !data?.success) {
        console.warn('[researchApi] Scrape failed:', error || data?.error);
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
      }

      console.log('[researchApi] Scrape success:', data.data?.markdown?.length || 0, 'chars');
      return data;
    } catch (err) {
      console.warn('[researchApi] Scrape error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Scrape failed',
      };
    }
  },

  // ANALYZE: Uses research-analyze (Lovable AI) - only AI usage in the system
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

  // EXTRACT: Uses research-extract (Lovable AI for structured extraction)
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

  // MAP: Uses research-map edge function for URL discovery
  async map(url: string, search?: string, limit: number = 100): Promise<MapResult> {
    try {
      console.log('[researchApi] Mapping with research-map:', url);
      
      const { data, error } = await supabase.functions.invoke('research-map', {
        body: { url, limit, search },
      });

      if (error || !data?.success) {
        console.warn('[researchApi] Map failed:', error || data?.error);
        return { success: true, links: [url] };
      }

      console.log('[researchApi] Map success:', data.links?.length || 0, 'links');
      return data;
    } catch (err) {
      console.warn('[researchApi] Map error:', err);
      return { success: true, links: [url] };
    }
  },

  // TAVILY SEARCH: Direct Tavily API call (uses configured TAVILY_API_KEY)
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

  // HYBRID SEARCH: Combines Tavily + internal sitemap discovery
  async hybridSearch(
    query: string,
    options?: {
      useTavily?: boolean;
      useInternal?: boolean;
      tavilyOptions?: {
        searchDepth?: 'basic' | 'advanced';
        topic?: 'general' | 'news' | 'finance';
        days?: number;
        maxResults?: number;
      };
      internalOptions?: {
        limit?: number;
        strictMode?: boolean;
        country?: string;
      };
    }
  ): Promise<SearchResult> {
    const useTavily = options?.useTavily !== false;
    const useInternal = options?.useInternal !== false;
    
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
                reliability: r.score || 0.8,
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

    if (useInternal) {
      promises.push(
        this.internalSearch(query, options?.internalOptions?.limit || 10, {
          strictMode: options?.internalOptions?.strictMode,
          country: options?.internalOptions?.country,
        })
          .then(internalResult => {
            if (internalResult.success && internalResult.data) {
              results.push(...internalResult.data);
            } else if (internalResult.error) {
              errors.push(`Internal: ${internalResult.error}`);
            }
          })
          .catch(err => {
            errors.push(`Internal: ${err.message}`);
          })
      );
    }

    await Promise.all(promises);

    // Deduplicate by URL
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    return {
      success: deduped.length > 0,
      data: deduped,
      searchMethod: useTavily && useInternal ? 'hybrid' : useTavily ? 'tavily' : 'internal',
      error: deduped.length === 0 && errors.length > 0 ? errors.join('; ') : undefined,
    };
  },
};

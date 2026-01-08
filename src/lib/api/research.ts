import { supabase } from "@/integrations/supabase/client";
import { withLLMConfig, getEndpointOverrides } from "@/lib/llmConfig";

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
    source?: string;
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
  // Search engine tracking
  engines?: string[];
  engineResults?: Record<string, number>;
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

export interface WebSearchResult {
  success: boolean;
  data?: Array<{
    url: string;
    title: string;
    description?: string;
    markdown?: string;
    source?: string;
    fetchedAt?: string;
  }>;
  error?: string;
  searchMethod?: string;
  engines?: string[];
  engineResults?: Record<string, number>;
  timing?: { total: number };
  totalResults?: number;
}

// ============ RESEARCH API - ZERO EXTERNAL DEPENDENCIES ============
// Uses ONLY embedded edge functions:
// 1. web-search - embedded search engine scraping (DuckDuckGo/Google/Bing)
// 2. research-search - sitemap discovery + internal scraping
// 3. research-scrape - direct URL content extraction
// 4. research-analyze - AI analysis (Lovable AI for report generation only)
// 5. research-extract - structured data extraction
// 6. research-map - URL discovery from sitemaps

export const researchApi = {
  // PRIMARY SEARCH: Uses embedded web-search (zero external API dependencies)
  async search(
    query: string, 
    limit: number = 12, 
    scrapeContent: boolean = true,
    options?: {
      strictMode?: boolean;
      minSources?: number;
      country?: string;
      tbs?: string; // Time filter
      searchEngine?: 'duckduckgo' | 'google' | 'bing' | 'all';
    }
  ): Promise<SearchResult> {
    try {
      console.log('[researchApi] Embedded web search:', query);
      
      // Use embedded web-search as primary (scrapes DuckDuckGo/Google/Bing)
      const webSearchResult = await this.webSearch(query, {
        maxResults: limit,
        scrapeContent: scrapeContent,
        searchEngine: options?.searchEngine || 'all',
      });

      if (webSearchResult.success && webSearchResult.data && webSearchResult.data.length > 0) {
        console.log('[researchApi] Embedded search success:', webSearchResult.data.length, 'results from engines:', webSearchResult.engines);
        
        // Count results per engine
        const engineResults: Record<string, number> = {};
        webSearchResult.data.forEach(item => {
          const engine = item.source || 'unknown';
          engineResults[engine] = (engineResults[engine] || 0) + 1;
        });
        
        return {
          success: true,
          data: webSearchResult.data.map((item, idx) => ({
            id: `web-${Date.now()}-${idx}`,
            url: item.url,
            title: item.title,
            description: item.description || '',
            markdown: item.markdown || item.description || '',
            content: item.markdown || item.description || '',
            fetchedAt: item.fetchedAt,
            reliability: 0.8 - (idx * 0.02),
            source: item.source,
          })),
          searchMethod: webSearchResult.searchMethod || 'embedded_web_search',
          engines: webSearchResult.engines,
          engineResults,
          timing: webSearchResult.timing,
        };
      }

      // Fallback to internal sitemap-based search
      console.log('[researchApi] Embedded search returned no results, falling back to sitemap search');
      return this.internalSearch(query, limit, options);
    } catch (err) {
      console.error('[researchApi] Search error:', err);
      return this.internalSearch(query, limit, options);
    }
  },

  // EMBEDDED WEB SEARCH: Uses web-search edge function (scrapes search engines)
  async webSearch(
    query: string,
    options?: {
      maxResults?: number;
      searchEngine?: 'duckduckgo' | 'google' | 'bing' | 'all';
      scrapeContent?: boolean;
      country?: string;
      // Priority sources - user-selected sources to prioritize
      prioritySources?: string[];
      // Data source ID from connector
      dataSourceId?: string;
    }
  ): Promise<WebSearchResult> {
    try {
      console.log('[researchApi] Calling embedded web-search:', query, {
        prioritySources: options?.prioritySources?.length || 0,
        dataSourceId: options?.dataSourceId,
      });
      
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: withLLMConfig({ 
          query, 
          maxResults: options?.maxResults || 10,
          searchEngine: options?.searchEngine || 'all',
          scrapeContent: options?.scrapeContent !== false,
          country: options?.country,
          prioritySources: options?.prioritySources,
          dataSourceId: options?.dataSourceId,
        }),
      });

      if (error) {
        console.error('[researchApi] Web search error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      console.error('[researchApi] Web search error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Web search failed' };
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
      console.log('[researchApi] Internal sitemap search:', query);
      
      const { data, error } = await supabase.functions.invoke('research-search', {
        body: withLLMConfig({ 
          query, 
          limit, 
          scrapeContent: true, 
          lang: 'en',
          strictMode: options?.strictMode ?? false,
          minSources: options?.minSources ?? 2,
          country: options?.country,
        }),
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
        searchMethod: data.searchMethod || 'internal_sitemap',
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
        body: withLLMConfig({ url, formats, onlyMainContent, waitFor }),
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
        body: withLLMConfig({ query, content, type, reportFormat }),
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
        body: withLLMConfig({ query, content, extractType }),
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
        body: withLLMConfig({ url, limit, search }),
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

  // HYBRID SEARCH: Combines embedded web search + internal sitemap discovery
  async hybridSearch(
    query: string,
    options?: {
      useWebSearch?: boolean;
      useInternal?: boolean;
      webSearchOptions?: {
        searchEngine?: 'duckduckgo' | 'google' | 'bing' | 'all';
        maxResults?: number;
        scrapeContent?: boolean;
      };
      internalOptions?: {
        limit?: number;
        strictMode?: boolean;
        country?: string;
      };
    }
  ): Promise<SearchResult> {
    const useWebSearch = options?.useWebSearch !== false;
    const useInternal = options?.useInternal !== false;
    
    const results: SearchResult['data'] = [];
    const errors: string[] = [];

    // Run searches in parallel
    const promises: Promise<void>[] = [];

    if (useWebSearch) {
      promises.push(
        this.webSearch(query, options?.webSearchOptions)
          .then(webResult => {
            if (webResult.success && webResult.data) {
              results.push(...webResult.data.map((r, idx) => ({
                url: r.url,
                title: r.title,
                description: r.description || '',
                markdown: r.markdown || r.description || '',
                fetchedAt: r.fetchedAt,
                sourceStatus: 'success' as const,
                reliability: 0.85 - (idx * 0.02),
                source: r.source,
              })));
            } else if (webResult.error) {
              errors.push(`WebSearch: ${webResult.error}`);
            }
          })
          .catch(err => {
            errors.push(`WebSearch: ${err.message}`);
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
      searchMethod: useWebSearch && useInternal ? 'hybrid_embedded' : useWebSearch ? 'embedded_web_search' : 'internal_sitemap',
      error: deduped.length === 0 && errors.length > 0 ? errors.join('; ') : undefined,
    };
  },

  // WIDE RESEARCH: Parallel sub-agent execution (Manus 1.6 MAX)
  async wideResearch(
    query: string,
    options?: {
      items?: string[];
      maxSubAgents?: number;
      scrapeDepth?: 'shallow' | 'medium' | 'deep';
      minSourcesPerItem?: number;
      country?: string;
    }
  ): Promise<{
    success: boolean;
    query: string;
    subResults: Array<{
      query: string;
      status: 'completed' | 'failed';
      sources: Array<{
        url: string;
        title: string;
        domain: string;
        content: string;
        markdown: string;
        fetchedAt: string;
        reliability: number;
        source: string;
      }>;
      error?: string;
    }>;
    aggregatedSources: Array<{
      url: string;
      title: string;
      domain: string;
      content: string;
      markdown: string;
      fetchedAt: string;
      reliability: number;
      source: string;
    }>;
    metadata: {
      subQueriesExecuted: number;
      successfulSubQueries: number;
      failedSubQueries: number;
      totalSourcesScraped: number;
      uniqueDomains: number;
    };
    timing: { total: number };
    error?: string;
  }> {
    try {
      console.log('[researchApi] Wide Research:', query);
      
      const { data, error } = await supabase.functions.invoke('wide-research', {
        body: withLLMConfig({ 
          query,
          items: options?.items,
          config: {
            maxSubAgents: options?.maxSubAgents || 8,
            scrapeDepth: options?.scrapeDepth || 'medium',
            minSourcesPerItem: options?.minSourcesPerItem || 2,
            country: options?.country,
          },
        }),
      });

      if (error) {
        console.error('[researchApi] Wide Research error:', error);
        return { 
          success: false, 
          query,
          subResults: [],
          aggregatedSources: [],
          metadata: {
            subQueriesExecuted: 0,
            successfulSubQueries: 0,
            failedSubQueries: 0,
            totalSourcesScraped: 0,
            uniqueDomains: 0,
          },
          timing: { total: 0 },
          error: error.message,
        };
      }

      console.log('[researchApi] Wide Research success:', data.metadata);
      return data;
    } catch (err) {
      console.error('[researchApi] Wide Research error:', err);
      return { 
        success: false, 
        query,
        subResults: [],
        aggregatedSources: [],
        metadata: {
          subQueriesExecuted: 0,
          successfulSubQueries: 0,
          failedSubQueries: 0,
          totalSourcesScraped: 0,
          uniqueDomains: 0,
        },
        timing: { total: 0 },
        error: err instanceof Error ? err.message : 'Wide research failed',
      };
    }
  },

  // WEB CRAWL: Advanced recursive site crawling with deduplication
  async webCrawl(
    url: string,
    options?: {
      query?: string;
      maxDepth?: number;
      maxPages?: number;
      followLinks?: boolean;
      includePatterns?: string[];
      excludePatterns?: string[];
      scrapeContent?: boolean;
      timeout?: number;
    }
  ): Promise<{
    success: boolean;
    pages: Array<{
      url: string;
      title: string;
      description: string;
      markdown: string;
      links: string[];
      depth: number;
      status: 'success' | 'failed' | 'timeout' | 'blocked';
      error?: string;
      responseTime: number;
      wordCount: number;
      metadata: {
        author?: string;
        publishDate?: string;
        language?: string;
        contentType?: string;
      };
    }>;
    discoveredUrls: string[];
    crawledCount: number;
    failedCount: number;
    totalTime: number;
    rootDomain: string;
    error?: string;
  }> {
    try {
      console.log('[researchApi] Web Crawl:', url);
      
      const { data, error } = await supabase.functions.invoke('web-crawl', {
        body: withLLMConfig({ 
          url,
          query: options?.query,
          maxDepth: options?.maxDepth ?? 3,
          maxPages: options?.maxPages ?? 20,
          followLinks: options?.followLinks ?? true,
          includePatterns: options?.includePatterns,
          excludePatterns: options?.excludePatterns,
          scrapeContent: options?.scrapeContent ?? true,
          timeout: options?.timeout,
        }),
      });

      if (error) {
        console.error('[researchApi] Web Crawl error:', error);
        return { 
          success: false, 
          pages: [],
          discoveredUrls: [],
          crawledCount: 0,
          failedCount: 0,
          totalTime: 0,
          rootDomain: '',
          error: error.message,
        };
      }

      console.log('[researchApi] Web Crawl success:', data.crawledCount, 'pages');
      return data;
    } catch (err) {
      console.error('[researchApi] Web Crawl error:', err);
      return { 
        success: false, 
        pages: [],
        discoveredUrls: [],
        crawledCount: 0,
        failedCount: 0,
        totalTime: 0,
        rootDomain: '',
        error: err instanceof Error ? err.message : 'Web crawl failed',
      };
    }
  },

  // DEEP CRAWL: Combines web crawl + content extraction for thorough research
  async deepCrawl(
    url: string,
    query: string,
    options?: {
      maxPages?: number;
      extractData?: boolean;
    }
  ): Promise<{
    success: boolean;
    pages: Array<{
      url: string;
      title: string;
      markdown: string;
      wordCount: number;
      relevanceScore: number;
    }>;
    combinedContent: string;
    totalPages: number;
    totalWords: number;
    error?: string;
  }> {
    try {
      console.log('[researchApi] Deep Crawl:', url, 'for query:', query);
      
      // First, crawl the website
      const crawlResult = await this.webCrawl(url, {
        query,
        maxPages: options?.maxPages ?? 15,
        maxDepth: 2,
        followLinks: true,
        scrapeContent: true,
      });
      
      if (!crawlResult.success || crawlResult.pages.length === 0) {
        return {
          success: false,
          pages: [],
          combinedContent: '',
          totalPages: 0,
          totalWords: 0,
          error: crawlResult.error || 'No pages found',
        };
      }
      
      // Score pages by query relevance
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      
      const scoredPages = crawlResult.pages
        .filter(p => p.status === 'success' && p.wordCount > 50)
        .map(page => {
          let score = 0;
          const content = (page.title + ' ' + page.markdown).toLowerCase();
          
          for (const term of queryTerms) {
            const matches = (content.match(new RegExp(term, 'gi')) || []).length;
            score += matches;
            if (page.title.toLowerCase().includes(term)) score += 5;
          }
          
          return {
            url: page.url,
            title: page.title,
            markdown: page.markdown,
            wordCount: page.wordCount,
            relevanceScore: Math.min(1, score / (queryTerms.length * 5)),
          };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Combine content from top pages
      const topPages = scoredPages.slice(0, 10);
      const combinedContent = topPages
        .map(p => `## ${p.title}\nSource: ${p.url}\n\n${p.markdown.slice(0, 3000)}`)
        .join('\n\n---\n\n');
      
      return {
        success: true,
        pages: topPages,
        combinedContent,
        totalPages: scoredPages.length,
        totalWords: topPages.reduce((sum, p) => sum + p.wordCount, 0),
      };
    } catch (err) {
      console.error('[researchApi] Deep Crawl error:', err);
      return {
        success: false,
        pages: [],
        combinedContent: '',
        totalPages: 0,
        totalWords: 0,
        error: err instanceof Error ? err.message : 'Deep crawl failed',
      };
    }
  },
};

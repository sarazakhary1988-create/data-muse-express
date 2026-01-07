import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TYPES ============
interface WideResearchRequest {
  query: string;
  items?: string[]; // Optional list of specific items to research
  config?: {
    maxSubAgents?: number;
    scrapeDepth?: 'shallow' | 'medium' | 'deep';
    minSourcesPerItem?: number;
    country?: string;
  };
}

interface WebSource {
  url: string;
  title: string;
  domain: string;
  content: string;
  markdown: string;
  fetchedAt: string;
  reliability: number;
  source: string;
  relevanceScore?: number;
  status?: 'pending' | 'scraped' | 'failed';
}

interface SubAgentResult {
  query: string;
  status: 'completed' | 'failed';
  sources: WebSource[];
  error?: string;
}

// ============ CONFIGURATION ============
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_000_000;
const CONCURRENT_SEARCHES = 5;
const MAX_RESULTS_PER_ENGINE = 10;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const BLOCKED_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'pinterest.com',
];

// ============ FETCH HELPERS ============
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithTimeout(
  url: string, 
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    if (!resp.ok) {
      return { ok: false, status: resp.status, text: '', error: `HTTP ${resp.status}` };
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const text = new TextDecoder('utf-8').decode(sliced);

    return { ok: true, status: resp.status, text };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, status: 0, text: '', error: error.includes('abort') ? 'Timeout' : error };
  } finally {
    clearTimeout(timeout);
  }
}

// ============ SEARCH ENGINES ============

// Add time-restricted query modifiers for recent news
function addRecencyModifiers(query: string): string[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const queries: string[] = [];
  
  // Original query with year
  queries.push(`${query} ${currentYear}`);
  
  // Add "latest" / "recent" / "news" modifiers
  if (!/\b(latest|recent|new|news|announced|announcement)\b/i.test(query)) {
    queries.push(`${query} latest news ${currentYear}`);
    queries.push(`${query} announced ${currentMonth} ${currentYear}`);
  }
  
  // For IPO-specific queries, add more targeted modifiers
  if (/\b(ipo|listing|public|stock)\b/i.test(query.toLowerCase())) {
    queries.push(`${query} upcoming ${currentYear}`);
    queries.push(`${query} filing ${currentMonth} ${currentYear}`);
  }
  
  return queries;
}

async function searchDuckDuckGo(query: string, useRecency = true): Promise<WebSource[]> {
  const results: WebSource[] = [];
  
  // Generate time-restricted queries
  const searchQueries = useRecency ? addRecencyModifiers(query) : [query];
  
  for (const searchQuery of searchQueries.slice(0, 2)) {
    try {
      // Add time filter: df=w (past week), df=m (past month)
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}&df=w`;
      
      console.log(`[wide-research] DuckDuckGo searching: "${searchQuery.slice(0, 60)}..."`);
      
      const response = await fetchWithTimeout(searchUrl);
      if (!response.ok) continue;

      const doc = new DOMParser().parseFromString(response.text, 'text/html');
      if (!doc) continue;

      const resultElements = doc.querySelectorAll('.result');
      
      for (const el of resultElements) {
        if (results.length >= MAX_RESULTS_PER_ENGINE) break;
        
        const linkEl = el.querySelector('.result__a');
        const snippetEl = el.querySelector('.result__snippet');
        
        if (!linkEl) continue;
        
        let href = linkEl.getAttribute('href') || '';
        const title = linkEl.textContent?.trim() || '';
        const description = snippetEl?.textContent?.trim() || '';
        
        if (href.includes('uddg=')) {
          const match = href.match(/uddg=([^&]+)/);
          if (match) {
            try { href = decodeURIComponent(match[1]); } catch {}
          }
        }
        
        if (!href.startsWith('http')) continue;
        
        try {
          const domain = new URL(href).hostname.toLowerCase();
          if (BLOCKED_DOMAINS.some(bd => domain.includes(bd))) continue;
        } catch { continue; }
        
        // Skip if already have this URL
        if (results.some(r => r.url === href)) continue;
        
        // Boost score for results mentioning current year or recent terms
        const currentYear = new Date().getFullYear();
        const textContent = `${title} ${description}`.toLowerCase();
        const recencyBoost = (
          textContent.includes(String(currentYear)) ? 0.15 :
          textContent.includes(String(currentYear - 1)) ? 0.05 : 0
        );
        
        results.push({
          url: href,
          title,
          domain: new URL(href).hostname.replace('www.', ''),
          content: description,
          markdown: description,
          source: 'duckduckgo',
          fetchedAt: new Date().toISOString(),
          reliability: 0.8,
          relevanceScore: 0.7 + Math.random() * 0.15 + recencyBoost,
          status: 'pending',
        });
      }
    } catch (e) {
      console.error('[wide-research] DuckDuckGo error:', e);
    }
  }

  console.log(`[wide-research] DuckDuckGo found ${results.length} results`);
  return results;
}

async function searchGoogle(query: string, useRecency = true): Promise<WebSource[]> {
  const results: WebSource[] = [];
  
  // Generate time-restricted queries
  const searchQueries = useRecency ? addRecencyModifiers(query) : [query];
  
  for (const searchQuery of searchQueries.slice(0, 2)) {
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      // tbs=qdr:w = past week, tbs=qdr:m = past month
      const searchUrl = `https://www.google.com/search?q=${encodedQuery}&num=${MAX_RESULTS_PER_ENGINE}&hl=en&tbs=qdr:m`;
      
      console.log(`[wide-research] Google searching: "${searchQuery.slice(0, 60)}..."`);
      
      const response = await fetchWithTimeout(searchUrl);
      if (!response.ok) continue;

      const doc = new DOMParser().parseFromString(response.text, 'text/html');
      if (!doc) continue;

      const resultDivs = doc.querySelectorAll('.g, .tF2Cxc');
      
      for (const el of resultDivs) {
        if (results.length >= MAX_RESULTS_PER_ENGINE) break;
        
        const linkEl = el.querySelector('a[href^="http"]');
        const titleEl = el.querySelector('h3');
        const snippetEl = el.querySelector('.VwiC3b, .IsZvec');
        
        if (!linkEl || !titleEl) continue;
        
        const href = linkEl.getAttribute('href') || '';
        const title = titleEl.textContent?.trim() || '';
        const description = snippetEl?.textContent?.trim() || '';
        
        if (!href.startsWith('http')) continue;
        
        try {
          const domain = new URL(href).hostname.toLowerCase();
          if (domain.includes('google.com')) continue;
          if (BLOCKED_DOMAINS.some(bd => domain.includes(bd))) continue;
        } catch { continue; }
        
        if (results.some(r => r.url === href)) continue;
        
        // Boost score for results mentioning current year
        const currentYear = new Date().getFullYear();
        const textContent = `${title} ${description}`.toLowerCase();
        const recencyBoost = (
          textContent.includes(String(currentYear)) ? 0.15 :
          textContent.includes(String(currentYear - 1)) ? 0.05 : 0
        );
        
        results.push({
          url: href,
          title,
          domain: new URL(href).hostname.replace('www.', ''),
          content: description,
          markdown: description,
          source: 'google',
          fetchedAt: new Date().toISOString(),
          reliability: 0.85,
          relevanceScore: 0.75 + Math.random() * 0.1 + recencyBoost,
          status: 'pending',
        });
      }
    } catch (e) {
      console.error('[wide-research] Google error:', e);
    }
  }

  console.log(`[wide-research] Google found ${results.length} results`);
  return results;
}

// ============ CONTENT EXTRACTION ============
function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

async function scrapeContent(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, 10000);
    if (!response.ok) return '';

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return '';

    const removeSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 
      'aside', 'header', '.advertisement', '.ad', '.social', '.comment'
    ];
    
    for (const sel of removeSelectors) {
      try {
        doc.querySelectorAll(sel).forEach((n: any) => n.remove());
      } catch {}
    }

    const mainContent = 
      doc.querySelector('article') ||
      doc.querySelector('main') ||
      doc.querySelector('[role="main"]') ||
      doc.querySelector('.content') ||
      doc.body;

    if (!mainContent) return '';

    const text = normalizeText(mainContent.textContent || '');
    return text.slice(0, 10000);
  } catch {
    return '';
  }
}

// ============ SUB-AGENT EXECUTION ============
async function executeSubAgent(query: string): Promise<SubAgentResult> {
  console.log(`[wide-research] SubAgent: "${query}"`);
  
  try {
    // Search all engines in parallel
    const [ddgResults, googleResults] = await Promise.allSettled([
      searchDuckDuckGo(query),
      searchGoogle(query),
    ]);
    
    const sources: WebSource[] = [];
    if (ddgResults.status === 'fulfilled') sources.push(...ddgResults.value);
    if (googleResults.status === 'fulfilled') sources.push(...googleResults.value);
    
    // Deduplicate
    const seen = new Set<string>();
    const uniqueSources = sources.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    }).slice(0, 8);
    
    // Scrape content from top results
    const scrapedSources: WebSource[] = [];
    for (let i = 0; i < Math.min(uniqueSources.length, 5); i++) {
      const source = uniqueSources[i];
      const content = await scrapeContent(source.url);
      const hasContent = content && content.length > 100;
      scrapedSources.push({
        ...source,
        content: content || source.content,
        markdown: content || source.markdown,
        status: hasContent ? 'scraped' : 'failed',
        // Boost relevance score for pages with substantial content
        relevanceScore: hasContent 
          ? Math.min(0.98, (source.relevanceScore || 0.7) + 0.1)
          : Math.max(0.3, (source.relevanceScore || 0.5) - 0.2),
      });
    }
    
    // Add remaining without deep scraping (mark as pending)
    scrapedSources.push(...uniqueSources.slice(5).map(s => ({
      ...s,
      status: 'pending' as const,
    })));
    
    console.log(`[wide-research] SubAgent completed: ${scrapedSources.length} sources`);
    
    return {
      query,
      status: 'completed',
      sources: scrapedSources,
    };
  } catch (error) {
    console.error(`[wide-research] SubAgent failed:`, error);
    return {
      query,
      status: 'failed',
      sources: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ QUERY DECOMPOSITION ============
function decomposeQuery(query: string): string[] {
  const subQueries: string[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  
  // Always add the original query with current year
  subQueries.push(`${query} ${currentYear}`);
  subQueries.push(query);
  
  const entityPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  const entities = new Set<string>();
  let match;
  while ((match = entityPattern.exec(query)) !== null) {
    if (match[1].length > 2 && !['The', 'And', 'For', 'With', 'From'].includes(match[1])) {
      entities.add(match[1]);
    }
  }
  
  const queryLower = query.toLowerCase();
  
  // For IPO queries, add specialized sub-queries for recent announcements
  if (/\b(ipo|listing|public|float)\b/i.test(queryLower)) {
    subQueries.push(`IPO announced ${currentMonth} ${currentYear}`);
    subQueries.push(`IPO filing ${currentYear} latest`);
    subQueries.push(`upcoming IPO ${currentYear} news`);
    
    // Saudi-specific IPO queries
    if (/saudi|ksa|tadawul|tasi|nomu|riyadh/i.test(queryLower)) {
      subQueries.push(`Saudi Arabia IPO ${currentYear} latest`);
      subQueries.push(`TASI Nomu IPO announced ${currentMonth} ${currentYear}`);
      subQueries.push(`CMA Saudi IPO approval ${currentYear}`);
      subQueries.push(`Tadawul new listing ${currentYear}`);
    }
  }
  
  entities.forEach(entity => {
    if (entity.length > 3) {
      subQueries.push(`${entity} company profile ${currentYear}`);
      if (/board|directors?|governance/i.test(queryLower)) {
        subQueries.push(`${entity} board of directors members`);
      }
      if (/shareholders?|ownership/i.test(queryLower)) {
        subQueries.push(`${entity} shareholders ownership`);
      }
      if (/saudi|ksa|tadawul/i.test(queryLower)) {
        subQueries.push(`${entity} Saudi Arabia ${currentYear}`);
      }
    }
  });
  
  return [...new Set(subQueries)].slice(0, 12);
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json() as WideResearchRequest;
    
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = body.query.trim();
    const config = body.config || {};
    const maxSubAgents = config.maxSubAgents || 8;

    console.log('[wide-research] Starting:', { query: query.slice(0, 80), maxSubAgents });

    // Decompose query
    const subQueries = body.items && body.items.length > 0 
      ? body.items 
      : decomposeQuery(query);

    console.log('[wide-research] Sub-queries:', subQueries);

    // Execute sub-agents in parallel batches
    const subResults: SubAgentResult[] = [];
    
    for (let i = 0; i < subQueries.length; i += CONCURRENT_SEARCHES) {
      const batch = subQueries.slice(i, i + CONCURRENT_SEARCHES);
      const batchResults = await Promise.all(batch.map(sq => executeSubAgent(sq)));
      subResults.push(...batchResults);
    }

    // Aggregate sources
    const seen = new Set<string>();
    const aggregatedSources: WebSource[] = [];
    
    for (const result of subResults) {
      for (const source of result.sources) {
        if (!seen.has(source.url)) {
          seen.add(source.url);
          aggregatedSources.push(source);
        }
      }
    }

    // Sort by reliability
    aggregatedSources.sort((a, b) => b.reliability - a.reliability);

    const totalTime = Date.now() - startTime;

    console.log('[wide-research] Complete:', {
      subQueries: subQueries.length,
      successful: subResults.filter(r => r.status === 'completed').length,
      totalSources: aggregatedSources.length,
      time: totalTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        query,
        subResults,
        aggregatedSources,
        metadata: {
          subQueriesExecuted: subQueries.length,
          successfulSubQueries: subResults.filter(r => r.status === 'completed').length,
          failedSubQueries: subResults.filter(r => r.status === 'failed').length,
          totalSourcesScraped: aggregatedSources.length,
          uniqueDomains: new Set(aggregatedSources.map(s => s.domain)).size,
        },
        timing: { total: totalTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[wide-research] Error:', e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Wide research failed',
        timing: { total: Date.now() - startTime },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

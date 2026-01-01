import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebSearchRequest {
  query: string;
  maxResults?: number;
  searchEngine?: 'duckduckgo' | 'google' | 'bing' | 'all';
  scrapeContent?: boolean;
  country?: string;
  language?: string;
}

interface SearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
  source: string;
  fetchedAt: string;
}

// ============ CONFIGURATION ============
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_RESULTS = 20;
const CONCURRENT_SCRAPES = 3;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'DNT': '1',
        ...options.headers,
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
    const isTimeout = error.includes('abort');
    return { ok: false, status: 0, text: '', error: isTimeout ? 'Timeout' : error };
  } finally {
    clearTimeout(timeout);
  }
}

// ============ DUCKDUCKGO SEARCH (HTML SCRAPING) ============
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    // DuckDuckGo HTML search page
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    
    console.log('[web-search] DuckDuckGo search:', searchUrl);
    
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        'Referer': 'https://duckduckgo.com/',
      }
    });

    if (!response.ok) {
      console.error('[web-search] DuckDuckGo failed:', response.error);
      return results;
    }

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return results;

    // Parse DuckDuckGo HTML results
    const resultElements = doc.querySelectorAll('.result');
    
    for (const el of resultElements) {
      if (results.length >= maxResults) break;
      
      const linkEl = el.querySelector('.result__a');
      const snippetEl = el.querySelector('.result__snippet');
      
      if (!linkEl) continue;
      
      let href = linkEl.getAttribute('href') || '';
      const title = linkEl.textContent?.trim() || '';
      const description = snippetEl?.textContent?.trim() || '';
      
      // DuckDuckGo sometimes uses redirect URLs
      if (href.includes('uddg=')) {
        const match = href.match(/uddg=([^&]+)/);
        if (match) {
          try {
            href = decodeURIComponent(match[1]);
          } catch { /* ignore */ }
        }
      }
      
      // Validate URL
      if (!href.startsWith('http')) continue;
      
      // Skip blocked domains
      try {
        const domain = new URL(href).hostname.toLowerCase();
        if (BLOCKED_DOMAINS.some(bd => domain.includes(bd))) continue;
      } catch { continue; }
      
      results.push({
        url: href,
        title,
        description,
        source: 'duckduckgo',
        fetchedAt: new Date().toISOString(),
      });
    }

    console.log('[web-search] DuckDuckGo found:', results.length, 'results');
  } catch (e) {
    console.error('[web-search] DuckDuckGo error:', e);
  }

  return results;
}

// ============ GOOGLE SEARCH (HTML SCRAPING) ============
async function searchGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    // Use Google's mobile search which is easier to parse
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&num=${Math.min(maxResults, 20)}&hl=en`;
    
    console.log('[web-search] Google search:', searchUrl);
    
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.google.com/',
      }
    });

    if (!response.ok) {
      console.error('[web-search] Google failed:', response.error);
      return results;
    }

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return results;

    // Google search results are in divs with class 'g' or in anchor tags
    const resultDivs = doc.querySelectorAll('.g, .tF2Cxc');
    
    for (const el of resultDivs) {
      if (results.length >= maxResults) break;
      
      const linkEl = el.querySelector('a[href^="http"]');
      const titleEl = el.querySelector('h3');
      const snippetEl = el.querySelector('.VwiC3b, .IsZvec, span[class*="snippet"]');
      
      if (!linkEl || !titleEl) continue;
      
      const href = linkEl.getAttribute('href') || '';
      const title = titleEl.textContent?.trim() || '';
      const description = snippetEl?.textContent?.trim() || '';
      
      if (!href.startsWith('http')) continue;
      
      // Skip Google's own pages and blocked domains
      try {
        const domain = new URL(href).hostname.toLowerCase();
        if (domain.includes('google.com')) continue;
        if (BLOCKED_DOMAINS.some(bd => domain.includes(bd))) continue;
      } catch { continue; }
      
      // Avoid duplicates
      if (results.some(r => r.url === href)) continue;
      
      results.push({
        url: href,
        title,
        description,
        source: 'google',
        fetchedAt: new Date().toISOString(),
      });
    }

    // Fallback: try to find links in a different structure
    if (results.length === 0) {
      const allLinks = doc.querySelectorAll('a[href^="http"]');
      for (const link of allLinks) {
        if (results.length >= maxResults) break;
        
        const href = link.getAttribute('href') || '';
        const title = link.textContent?.trim() || '';
        
        if (title.length < 10 || title.length > 200) continue;
        if (!href.startsWith('http')) continue;
        
        try {
          const domain = new URL(href).hostname.toLowerCase();
          if (domain.includes('google.com')) continue;
          if (BLOCKED_DOMAINS.some(bd => domain.includes(bd))) continue;
        } catch { continue; }
        
        if (results.some(r => r.url === href)) continue;
        
        results.push({
          url: href,
          title,
          description: '',
          source: 'google',
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    console.log('[web-search] Google found:', results.length, 'results');
  } catch (e) {
    console.error('[web-search] Google error:', e);
  }

  return results;
}

// ============ BING SEARCH (HTML SCRAPING) ============
async function searchBing(query: string, maxResults: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.bing.com/search?q=${encodedQuery}&count=${Math.min(maxResults, 20)}`;
    
    console.log('[web-search] Bing search:', searchUrl);
    
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        'Referer': 'https://www.bing.com/',
      }
    });

    if (!response.ok) {
      console.error('[web-search] Bing failed:', response.error);
      return results;
    }

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return results;

    // Bing search results
    const resultElements = doc.querySelectorAll('.b_algo, li.b_algo');
    
    for (const el of resultElements) {
      if (results.length >= maxResults) break;
      
      const linkEl = el.querySelector('h2 a, a');
      const snippetEl = el.querySelector('.b_caption p, p');
      
      if (!linkEl) continue;
      
      const href = linkEl.getAttribute('href') || '';
      const title = linkEl.textContent?.trim() || '';
      const description = snippetEl?.textContent?.trim() || '';
      
      if (!href.startsWith('http')) continue;
      
      try {
        const domain = new URL(href).hostname.toLowerCase();
        if (domain.includes('bing.com') || domain.includes('microsoft.com')) continue;
        if (BLOCKED_DOMAINS.some(bd => domain.includes(bd))) continue;
      } catch { continue; }
      
      if (results.some(r => r.url === href)) continue;
      
      results.push({
        url: href,
        title,
        description,
        source: 'bing',
        fetchedAt: new Date().toISOString(),
      });
    }

    console.log('[web-search] Bing found:', results.length, 'results');
  } catch (e) {
    console.error('[web-search] Bing error:', e);
  }

  return results;
}

// ============ CONTENT SCRAPING ============
function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

async function scrapeContent(url: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) return '';

    const doc = new DOMParser().parseFromString(response.text, 'text/html');
    if (!doc) return '';

    // Remove noise
    const removeSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 
      'aside', 'header', '.advertisement', '.ad', '.social', '.comment'
    ];
    
    for (const sel of removeSelectors) {
      try {
        doc.querySelectorAll(sel).forEach((n: any) => n.remove());
      } catch { /* ignore */ }
    }

    // Find main content
    const mainContent = 
      doc.querySelector('article') ||
      doc.querySelector('main') ||
      doc.querySelector('[role="main"]') ||
      doc.querySelector('.content') ||
      doc.querySelector('#content') ||
      doc.body;

    if (!mainContent) return '';

    const text = normalizeText(mainContent.textContent || '');
    return text.slice(0, 8000);
  } catch (e) {
    console.error('[web-search] Scrape error for', url, ':', e);
    return '';
  }
}

// Batch scrape with concurrency control
async function batchScrape(results: SearchResult[], concurrency: number): Promise<SearchResult[]> {
  const scraped: SearchResult[] = [];
  
  for (let i = 0; i < results.length; i += concurrency) {
    const batch = results.slice(i, i + concurrency);
    const promises = batch.map(async (result) => {
      const content = await scrapeContent(result.url);
      return { ...result, markdown: content || result.description };
    });
    
    const batchResults = await Promise.allSettled(promises);
    
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        scraped.push(r.value);
      }
    }
  }
  
  return scraped;
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json() as WebSearchRequest;
    
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = body.query.trim().slice(0, 500);
    const maxResults = Math.min(Math.max(body.maxResults || 10, 1), MAX_RESULTS);
    const searchEngine = body.searchEngine || 'all';
    const scrapeContent = body.scrapeContent !== false;

    console.log('[web-search] Starting search:', { query: query.slice(0, 80), searchEngine, maxResults, scrapeContent });

    // Execute searches based on engine preference
    let allResults: SearchResult[] = [];

    if (searchEngine === 'all') {
      // Search all engines in parallel, prioritize DuckDuckGo (most reliable for scraping)
      const [ddgResults, googleResults, bingResults] = await Promise.allSettled([
        searchDuckDuckGo(query, maxResults),
        searchGoogle(query, maxResults),
        searchBing(query, maxResults),
      ]);

      if (ddgResults.status === 'fulfilled') allResults.push(...ddgResults.value);
      if (googleResults.status === 'fulfilled') allResults.push(...googleResults.value);
      if (bingResults.status === 'fulfilled') allResults.push(...bingResults.value);
    } else if (searchEngine === 'duckduckgo') {
      allResults = await searchDuckDuckGo(query, maxResults);
    } else if (searchEngine === 'google') {
      allResults = await searchGoogle(query, maxResults);
    } else if (searchEngine === 'bing') {
      allResults = await searchBing(query, maxResults);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const deduped = allResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    }).slice(0, maxResults);

    console.log('[web-search] Deduplicated to', deduped.length, 'unique results');

    // Optionally scrape content from each result
    let finalResults: SearchResult[];
    if (scrapeContent && deduped.length > 0) {
      console.log('[web-search] Scraping content from', Math.min(deduped.length, 8), 'pages');
      finalResults = await batchScrape(deduped.slice(0, 8), CONCURRENT_SCRAPES);
      // Add remaining without scraping
      finalResults.push(...deduped.slice(8));
    } else {
      finalResults = deduped;
    }

    const totalTime = Date.now() - startTime;

    console.log('[web-search] Complete:', { 
      results: finalResults.length, 
      time: totalTime,
      engines: searchEngine === 'all' ? 'ddg+google+bing' : searchEngine
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: finalResults,
        totalResults: finalResults.length,
        searchMethod: 'embedded_web_search',
        engines: searchEngine === 'all' ? ['duckduckgo', 'google', 'bing'] : [searchEngine],
        timing: { total: totalTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[web-search] Error:', e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Search failed',
        timing: { total: Date.now() - startTime },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

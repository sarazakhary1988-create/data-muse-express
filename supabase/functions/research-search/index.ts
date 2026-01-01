import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  timeFrame?: string;
  strictMode?: boolean;
  minSources?: number;
  seedUrls?: string[];
  deepScrape?: boolean;
}

type SearchItem = {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
  fetchedAt: string;
  sourceStatus: 'success' | 'partial' | 'failed';
  responseTime?: number;
  wordCount?: number;
};

type SourceStatus = {
  name: string;
  baseUrl: string;
  status: 'success' | 'failed' | 'timeout' | 'blocked' | 'no_content' | 'pending' | 'scraping';
  pagesFound: number;
  pagesExtracted: number;
  error?: string;
  responseTime?: number;
};

// ============ CONFIGURATION ============
const MAX_QUERY_LENGTH = 2000;
const MAX_LIMIT = 25;
const MIN_LIMIT = 1;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 1_500_000;
const CONCURRENT_FETCHES = 5;

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// Domain-specific research sources by category
const RESEARCH_SOURCES = {
  // General news/research
  general: [
    { name: 'Reuters', baseUrl: 'https://www.reuters.com', category: 'news' },
    { name: 'Bloomberg', baseUrl: 'https://www.bloomberg.com', category: 'financial' },
    { name: 'CNBC', baseUrl: 'https://www.cnbc.com', category: 'financial' },
    { name: 'BBC', baseUrl: 'https://www.bbc.com', category: 'news' },
  ],
  // Saudi/MENA markets
  saudi: [
    { name: 'Saudi Exchange', baseUrl: 'https://www.saudiexchange.sa', category: 'official' },
    { name: 'Tadawul', baseUrl: 'https://www.tadawul.com.sa', category: 'official' },
    { name: 'Capital Market Authority', baseUrl: 'https://cma.org.sa', category: 'regulator' },
    { name: 'Argaam', baseUrl: 'https://www.argaam.com', category: 'news' },
    { name: 'Mubasher', baseUrl: 'https://english.mubasher.info', category: 'news' },
  ],
  // Technology
  tech: [
    { name: 'TechCrunch', baseUrl: 'https://techcrunch.com', category: 'news' },
    { name: 'Ars Technica', baseUrl: 'https://arstechnica.com', category: 'news' },
    { name: 'The Verge', baseUrl: 'https://www.theverge.com', category: 'news' },
  ],
  // Academic/Research
  academic: [
    { name: 'arXiv', baseUrl: 'https://arxiv.org', category: 'academic' },
    { name: 'PubMed', baseUrl: 'https://pubmed.ncbi.nlm.nih.gov', category: 'academic' },
  ],
};

// ============ VALIDATION HELPERS ============
function validateUrlOrThrow(url: string): string {
  let formatted = url.trim();
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `https://${formatted}`;
  }

  const parsed = new URL(formatted);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname)) throw new Error("URL not allowed");
  for (const p of BLOCKED_IP_PATTERNS) if (p.test(hostname)) throw new Error("URL not allowed");

  return parsed.toString();
}

function validateQuery(query: unknown): string {
  if (typeof query !== 'string') throw new Error('Query is required');
  const trimmed = query.trim();
  if (!trimmed) throw new Error('Query cannot be empty');
  return trimmed.slice(0, MAX_QUERY_LENGTH);
}

function validateLimit(limit: unknown): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) return 12;
  return Math.max(MIN_LIMIT, Math.min(Math.floor(limit), MAX_LIMIT));
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// ============ KEYWORD EXTRACTION ============
function keywordsFromQuery(query: string): string[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "to", "for", "of", "on", "in", "with", "by", 
    "from", "during", "as", "at", "into", "this", "that", "these", "those", 
    "report", "generate", "provide", "analysis", "what", "how", "why", "when",
    "where", "which", "who", "please", "can", "could", "would", "should",
  ]);
  
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length >= 3)
    .filter(w => !stop.has(w));
    
  return Array.from(new Set(words)).slice(0, 15);
}

// ============ PARALLEL FETCH WITH CONCURRENCY CONTROL ============
async function fetchWithTimeout(
  url: string, 
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; text: string; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Cache-Control': 'no-cache',
      }
    });

    const responseTime = Date.now() - startTime;
    
    if (!resp.ok) {
      return { ok: false, status: resp.status, text: '', responseTime, error: `HTTP ${resp.status}` };
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const text = new TextDecoder('utf-8').decode(sliced);

    return { ok: true, status: resp.status, text, responseTime };
  } catch (e) {
    const responseTime = Date.now() - startTime;
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    const isTimeout = errorMsg.includes('abort') || responseTime >= timeoutMs - 100;
    return { 
      ok: false, 
      status: 0, 
      text: '', 
      responseTime,
      error: isTimeout ? 'Timeout' : errorMsg 
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Batch fetch with concurrency control
async function batchFetch<T>(
  items: T[],
  fetchFn: (item: T) => Promise<any>,
  concurrency: number
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fetchFn));
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ error: result.reason?.message || 'Failed' });
      }
    }
  }
  
  return results;
}

// ============ CONTENT EXTRACTION ============
function extractReadableText(html: string): { 
  title: string; 
  description: string; 
  text: string;
  wordCount: number;
  headings: string[];
} {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return { title: '', description: '', text: '', wordCount: 0, headings: [] };

  const title = normalizeText(
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('h1')?.textContent ||
    doc.querySelector('title')?.textContent || ''
  );
  
  const description = normalizeText(
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  );

  // Find main content
  const candidates = [
    doc.querySelector('article'),
    doc.querySelector('main'),
    doc.querySelector('[role="main"]'),
    doc.querySelector('.content'),
    doc.querySelector('#content'),
    doc.body,
  ].filter(Boolean) as any[];

  const root = candidates[0];
  if (!root) return { title, description, text: '', wordCount: 0, headings: [] };

  // Remove noise
  for (const sel of ['script', 'style', 'noscript', 'nav', 'footer', 'aside', 'header', '.ad', '.advertisement', '.social', '.comment']) {
    try {
      root.querySelectorAll(sel).forEach((n: any) => n.remove());
    } catch { /* ignore */ }
  }

  // Extract headings
  const headings: string[] = [];
  root.querySelectorAll('h1, h2, h3').forEach((h: any) => {
    const text = normalizeText(h.textContent || '');
    if (text.length > 3 && text.length < 150) {
      headings.push(text);
    }
  });

  const text = normalizeText(root.textContent || '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  
  return { title, description, text, wordCount, headings };
}

// ============ URL DISCOVERY FROM SITEMAPS ============
function parseSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = m[1].trim();
    if (u.startsWith('http')) urls.push(u);
  }
  return urls;
}

async function discoverSitemaps(baseUrl: string): Promise<string[]> {
  const out = new Set<string>();
  
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const r = await fetchWithTimeout(robotsUrl, 5000);
    if (r.ok && r.text) {
      for (const line of r.text.split('\n')) {
        const m = line.match(/^\s*Sitemap:\s*(.+)\s*$/i);
        if (m?.[1]) out.add(m[1].trim());
      }
    }
  } catch { /* ignore */ }

  // Default sitemaps
  try { out.add(new URL('/sitemap.xml', baseUrl).toString()); } catch {}
  try { out.add(new URL('/sitemap_index.xml', baseUrl).toString()); } catch {}
  try { out.add(new URL('/news-sitemap.xml', baseUrl).toString()); } catch {}

  return Array.from(out);
}

async function collectCandidateUrls(baseUrl: string, maxUrls: number): Promise<{ urls: string[]; sitemapFound: boolean }> {
  const sitemaps = await discoverSitemaps(baseUrl);
  const urls: string[] = [];
  let sitemapFound = false;

  // Fetch sitemaps in parallel
  const results = await batchFetch(
    sitemaps.slice(0, 3),
    async (sm) => {
      const res = await fetchWithTimeout(sm, 8000);
      return res.ok ? res.text : null;
    },
    3
  );

  for (const content of results) {
    if (!content) continue;
    sitemapFound = true;
    const found = parseSitemapUrls(content);
    for (const u of found) {
      if (urls.length >= maxUrls) break;
      urls.push(u);
    }
    if (urls.length >= maxUrls) break;
  }

  return { urls, sitemapFound };
}

// ============ URL SCORING FOR RELEVANCE ============
function scoreUrl(url: string, keywords: string[], query: string): number {
  const u = url.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;

  // Keyword matches
  for (const k of keywords) {
    if (u.includes(k)) score += 3;
  }

  // Recency signals
  const currentYear = new Date().getFullYear();
  if (u.includes(String(currentYear))) score += 5;
  if (u.includes(String(currentYear - 1))) score += 3;
  
  // Content type signals
  if (u.includes('news') || u.includes('article')) score += 2;
  if (u.includes('press') || u.includes('announcement')) score += 2;
  if (u.includes('report') || u.includes('analysis')) score += 3;
  if (u.includes('ipo') || u.includes('listing')) score += 4;
  if (u.includes('disclosure')) score += 3;
  
  // Negative signals
  if (u.includes('login') || u.includes('signup') || u.includes('register')) score -= 10;
  if (u.includes('cart') || u.includes('checkout')) score -= 10;
  if (u.includes('privacy') || u.includes('terms') || u.includes('cookie')) score -= 5;
  if (u.includes('.pdf')) score -= 2; // PDFs often fail to parse

  return score;
}

// ============ DETECT QUERY DOMAIN ============
function detectQueryDomain(query: string): string[] {
  const q = query.toLowerCase();
  const domains: string[] = [];
  
  if (/\b(saudi|tasi|tadawul|nomu|riyadh|ksa|mena|gcc)\b/.test(q)) {
    domains.push('saudi');
  }
  if (/\b(tech|software|ai|machine learning|startup|silicon|app)\b/.test(q)) {
    domains.push('tech');
  }
  if (/\b(research|study|paper|academic|science|journal)\b/.test(q)) {
    domains.push('academic');
  }
  
  if (domains.length === 0) {
    domains.push('general');
  }
  
  return domains;
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  
  try {
    const body = await req.json() as SearchRequest;
    const query = validateQuery(body.query);
    const limit = validateLimit(body.limit);
    const strictMode = body.strictMode === true;
    const minSources = typeof body.minSources === 'number' ? Math.max(1, body.minSources) : 2;
    const deepScrape = body.deepScrape !== false;

    const keywords = keywordsFromQuery(query);
    const domains = detectQueryDomain(query);
    const country = (typeof body.country === 'string' ? body.country.toLowerCase().trim() : undefined);
    
    // Override domains if country specified
    if (country === 'sa' || domains.includes('saudi')) {
      domains.length = 0;
      domains.push('saudi');
    }

    const seedUrls = Array.isArray(body.seedUrls) 
      ? body.seedUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).slice(0, 20) 
      : [];

    console.log('[research-search] Starting', { query: query.slice(0, 100), domains, keywords, strictMode, limit });

    // Collect sources based on detected domains
    const sources: { name: string; baseUrl: string; category: string }[] = [];
    for (const domain of domains) {
      const domainSources = RESEARCH_SOURCES[domain as keyof typeof RESEARCH_SOURCES] || [];
      sources.push(...domainSources);
    }

    // Add seed URLs as custom sources
    for (const seedUrl of seedUrls) {
      try {
        const parsed = new URL(validateUrlOrThrow(seedUrl));
        sources.push({ 
          name: parsed.hostname.replace('www.', ''), 
          baseUrl: seedUrl, 
          category: 'custom' 
        });
      } catch { /* ignore invalid */ }
    }

    // Initialize source statuses
    const sourceStatuses: SourceStatus[] = sources.map(s => ({
      name: s.name,
      baseUrl: s.baseUrl,
      status: 'pending',
      pagesFound: 0,
      pagesExtracted: 0,
    }));

    // Phase 1: Parallel source discovery
    console.log('[research-search] Phase 1: Discovering URLs from', sources.length, 'sources');
    
    const discoveryResults = await batchFetch(
      sources,
      async (source) => {
        const idx = sources.indexOf(source);
        sourceStatuses[idx].status = 'scraping';
        
        let safeUrl: string;
        try {
          safeUrl = validateUrlOrThrow(source.baseUrl);
        } catch (e) {
          sourceStatuses[idx].status = 'blocked';
          sourceStatuses[idx].error = 'Invalid URL';
          return { urls: [], error: 'Invalid URL' };
        }

        // Test connectivity
        const connectTest = await fetchWithTimeout(safeUrl, 8000);
        sourceStatuses[idx].responseTime = connectTest.responseTime;

        if (!connectTest.ok) {
          sourceStatuses[idx].status = connectTest.error?.includes('Timeout') ? 'timeout' : 'failed';
          sourceStatuses[idx].error = connectTest.error || `HTTP ${connectTest.status}`;
          return { urls: [], error: connectTest.error };
        }

        // Discover URLs from sitemaps
        const { urls, sitemapFound } = await collectCandidateUrls(safeUrl, 150);
        
        if (urls.length === 0) {
          urls.push(safeUrl); // At least include homepage
        }

        sourceStatuses[idx].pagesFound = urls.length;
        sourceStatuses[idx].status = urls.length > 0 ? 'success' : 'no_content';
        
        return { urls, sitemapFound };
      },
      CONCURRENT_FETCHES
    );

    // Collect and score all candidate URLs
    const candidateSet = new Map<string, number>(); // url -> score
    
    for (const result of discoveryResults) {
      if (result.error) continue;
      for (const url of result.urls || []) {
        const score = scoreUrl(url, keywords, query);
        const existing = candidateSet.get(url) || 0;
        candidateSet.set(url, Math.max(existing, score));
      }
    }

    // Sort by score and take top candidates
    const sortedCandidates = Array.from(candidateSet.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 3)
      .map(([url]) => url);

    console.log('[research-search] Phase 2: Fetching', sortedCandidates.length, 'candidate pages');

    // Phase 2: Parallel content extraction
    const items: SearchItem[] = [];
    
    if (deepScrape && sortedCandidates.length > 0) {
      const fetchResults = await batchFetch(
        sortedCandidates,
        async (url) => {
          let safeUrl: string;
          try {
            safeUrl = validateUrlOrThrow(url);
          } catch {
            return null;
          }

          const res = await fetchWithTimeout(safeUrl, 12000);
          if (!res.ok || !res.text) return null;

          const extracted = extractReadableText(res.text);
          if (!extracted.text || extracted.wordCount < 50) return null;

          // Relevance check
          const textLower = extracted.text.toLowerCase();
          const hitCount = keywords.reduce((acc, k) => acc + (textLower.includes(k) ? 1 : 0), 0);
          if (keywords.length > 0 && hitCount === 0) return null;

          // Update source status
          const domain = new URL(safeUrl).hostname;
          const sourceIdx = sourceStatuses.findIndex(s => safeUrl.includes(new URL(s.baseUrl).hostname));
          if (sourceIdx >= 0) {
            sourceStatuses[sourceIdx].pagesExtracted++;
          }

          return {
            url: safeUrl,
            title: extracted.title || domain.replace('www.', ''),
            description: extracted.description || extracted.text.slice(0, 200),
            markdown: `# ${extracted.title || 'Source'}\n\n${extracted.text.slice(0, 3000)}\n\n---\nSource: ${safeUrl}`,
            fetchedAt: new Date().toISOString(),
            sourceStatus: 'success' as const,
            responseTime: res.responseTime,
            wordCount: extracted.wordCount,
          };
        },
        CONCURRENT_FETCHES
      );

      for (const result of fetchResults) {
        if (result && items.length < limit) {
          items.push(result);
        }
      }
    }

    // Check strict mode requirements
    const successfulSources = sourceStatuses.filter(s => s.status === 'success').length;
    
    if (strictMode && successfulSources < minSources) {
      console.log('[research-search] STRICT MODE FAILURE');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Strict Mode: Only ${successfulSources}/${minSources} required sources were accessible`,
          strictModeFailure: true,
          sourceStatuses,
          unreachableSources: sourceStatuses.filter(s => s.status !== 'success').map(s => ({
            name: s.name,
            url: s.baseUrl,
            reason: s.error || s.status,
            responseTime: s.responseTime
          })),
          timing: { total: Date.now() - startTime },
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (strictMode && items.length < Math.min(minSources, limit)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Strict Mode: Only ${items.length} relevant pages found (minimum ${Math.min(minSources, limit)} required)`,
          strictModeFailure: true,
          sourceStatuses,
          timing: { total: Date.now() - startTime },
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalTime = Date.now() - startTime;
    console.log('[research-search] SUCCESS', { items: items.length, sources: successfulSources, time: totalTime });

    return new Response(
      JSON.stringify({
        success: true,
        data: items,
        totalResults: items.length,
        searchMethod: 'realtime_scrape',
        country: country || null,
        strictMode,
        sourceStatuses,
        summary: {
          sourcesChecked: sourceStatuses.length,
          sourcesReachable: successfulSources,
          sourcesUnreachable: sourceStatuses.length - successfulSources,
          totalPagesFound: sourceStatuses.reduce((acc, s) => acc + s.pagesFound, 0),
          totalPagesExtracted: items.length,
          keywords,
          domains,
        },
        timing: {
          total: totalTime,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[research-search] Error:', e);
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

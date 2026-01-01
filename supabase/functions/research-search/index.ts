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
  strictMode?: boolean; // If true, fail if not enough sources
  minSources?: number;  // Minimum sources required in strict mode
}

type SearchItem = {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
  fetchedAt: string;
  sourceStatus: 'success' | 'partial';
};

type SourceStatus = {
  name: string;
  baseUrl: string;
  status: 'success' | 'failed' | 'timeout' | 'blocked' | 'no_content';
  pagesFound: number;
  pagesExtracted: number;
  error?: string;
  responseTime?: number;
};

const MAX_QUERY_LENGTH = 2000;
const MAX_LIMIT = 20;
const MIN_LIMIT = 1;

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 900_000;

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

// Saudi market sources with metadata
const SAUDI_SOURCES = [
  { name: 'Saudi Exchange', baseUrl: 'https://www.saudiexchange.sa', category: 'official' },
  { name: 'Tadawul', baseUrl: 'https://www.tadawul.com.sa', category: 'official' },
  { name: 'Capital Market Authority', baseUrl: 'https://cma.org.sa', category: 'regulator' },
  { name: 'Argaam', baseUrl: 'https://www.argaam.com', category: 'news' },
  { name: 'Mubasher', baseUrl: 'https://english.mubasher.info', category: 'news' },
];

function validateUrlOrThrow(url: string): string {
  let formatted = url.trim();
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `https://${formatted}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(formatted);
  } catch {
    throw new Error("Invalid URL format");
  }

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
  if (typeof limit !== 'number' || Number.isNaN(limit)) return 10;
  return Math.max(MIN_LIMIT, Math.min(Math.floor(limit), MAX_LIMIT));
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function keywordsFromQuery(query: string): string[] {
  const stop = new Set(["the","a","an","and","or","to","for","of","on","in","with","by","from","during","as","at","into","this","that","these","those","report","generate","provide","analysis","market","ipo","ipos","tasi","nomu","saudi","arabia","riyadh"]);
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length >= 3)
    .filter(w => !stop.has(w));
  return Array.from(new Set(words)).slice(0, 12);
}

async function fetchText(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<{ ok: boolean; status: number; text: string; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'LovableResearchBot/1.0 (Research Engine)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      }
    });

    const responseTime = Date.now() - startTime;
    const status = resp.status;
    
    if (!resp.ok) {
      return { ok: false, status, text: '', responseTime, error: `HTTP ${status}` };
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const text = new TextDecoder('utf-8').decode(sliced);

    return { ok: true, status, text, responseTime };
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
    clearTimeout(t);
  }
}

function extractReadableText(html: string): { title: string; description: string; text: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return { title: '', description: '', text: '' };

  const title = normalizeText(doc.querySelector('title')?.textContent ?? '');
  const description = normalizeText(doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '');

  const candidates = [
    doc.querySelector('article'),
    doc.querySelector('main'),
    doc.querySelector('[role="main"]'),
    doc.body,
  ].filter(Boolean) as any[];

  const root = candidates[0];
  if (!root) return { title, description, text: '' };

  for (const sel of ['script','style','noscript','nav','footer','aside','header']) {
    root.querySelectorAll(sel).forEach((n: any) => n.remove());
  }

  const text = normalizeText(root.textContent ?? '');
  return { title, description, text };
}

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
    const r = await fetchText(robotsUrl, 8000);
    if (r.ok && r.text) {
      for (const line of r.text.split('\n')) {
        const m = line.match(/^\s*Sitemap:\s*(.+)\s*$/i);
        if (m?.[1]) out.add(m[1].trim());
      }
    }
  } catch { /* ignore */ }

  try { out.add(new URL('/sitemap.xml', baseUrl).toString()); } catch {}
  try { out.add(new URL('/sitemap_index.xml', baseUrl).toString()); } catch {}

  return Array.from(out);
}

async function collectCandidateUrls(baseUrl: string, maxUrls: number): Promise<{ urls: string[]; sitemapFound: boolean }> {
  const sitemaps = await discoverSitemaps(baseUrl);
  const urls: string[] = [];
  let sitemapFound = false;

  for (const sm of sitemaps.slice(0, 3)) {
    const res = await fetchText(sm, 10_000);
    if (!res.ok || !res.text) continue;

    sitemapFound = true;
    const found = parseSitemapUrls(res.text);
    for (const u of found) {
      if (urls.length >= maxUrls) break;
      urls.push(u);
    }
    if (urls.length >= maxUrls) break;
  }

  return { urls, sitemapFound };
}

function scoreUrl(url: string, keywords: string[]): number {
  const u = url.toLowerCase();
  let s = 0;
  for (const k of keywords) if (u.includes(k)) s += 2;
  if (u.includes('ipo')) s += 2;
  if (u.includes('news') || u.includes('press') || u.includes('announcement')) s += 1;
  if (u.includes('2024') || u.includes('2025')) s += 1;
  return s;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as SearchRequest;
    const query = validateQuery(body.query);
    const limit = validateLimit(body.limit);
    const strictMode = body.strictMode === true;
    const minSources = typeof body.minSources === 'number' ? Math.max(1, body.minSources) : 2;

    const kw = keywordsFromQuery(query);
    const country = (typeof body.country === 'string' ? body.country.toLowerCase().trim() : undefined);
    const isSaudi = country === 'sa' || /\b(saudi|tasi|tadawul|nomu|riyadh)\b/i.test(query);

    const sources = isSaudi ? SAUDI_SOURCES : SAUDI_SOURCES;

    console.log('[research-search] mode=internal_fetch strictMode=' + strictMode, { isSaudi, limit, keywords: kw });

    // Track source status
    const sourceStatuses: SourceStatus[] = [];
    const candidateSet = new Set<string>();

    // Process each source
    for (const source of sources) {
      const status: SourceStatus = {
        name: source.name,
        baseUrl: source.baseUrl,
        status: 'failed',
        pagesFound: 0,
        pagesExtracted: 0,
      };

      let safeSeed: string;
      try {
        safeSeed = validateUrlOrThrow(source.baseUrl);
      } catch (e) {
        status.status = 'blocked';
        status.error = 'Invalid URL';
        sourceStatuses.push(status);
        continue;
      }

      // Test connectivity first
      const connectTest = await fetchText(safeSeed, 8000);
      status.responseTime = connectTest.responseTime;

      if (!connectTest.ok) {
        status.status = connectTest.error?.includes('Timeout') ? 'timeout' : 'failed';
        status.error = connectTest.error || `HTTP ${connectTest.status}`;
        sourceStatuses.push(status);
        continue;
      }

      // Discover URLs from sitemaps
      const { urls, sitemapFound } = await collectCandidateUrls(safeSeed, 80);
      
      if (urls.length === 0 && !sitemapFound) {
        // No sitemap, just use homepage
        urls.push(safeSeed);
      }

      status.pagesFound = urls.length;
      urls.forEach(u => candidateSet.add(u));
      
      // Always include homepage as a candidate
      candidateSet.add(safeSeed);
      
      status.status = urls.length > 0 ? 'success' : 'no_content';
      sourceStatuses.push(status);
    }

    // Check strict mode requirements
    const successfulSources = sourceStatuses.filter(s => s.status === 'success').length;
    
    if (strictMode && successfulSources < minSources) {
      console.log('[research-search] STRICT MODE FAILURE - not enough sources');
      
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
          reachableSources: sourceStatuses.filter(s => s.status === 'success').map(s => ({
            name: s.name,
            url: s.baseUrl,
            pagesFound: s.pagesFound
          })),
          recommendations: [
            'Try again later - some sources may be temporarily unavailable',
            'Check if the sources are accessible from your region',
            'Disable strict mode to get partial results'
          ]
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidates = Array.from(candidateSet);
    candidates.sort((a, b) => scoreUrl(b, kw) - scoreUrl(a, kw));

    // Fetch + extract top pages
    const chosen = candidates.slice(0, Math.max(limit * 2, 12));
    const items: SearchItem[] = [];

    for (const url of chosen) {
      if (items.length >= limit) break;

      let safeUrl: string;
      try {
        safeUrl = validateUrlOrThrow(url);
      } catch {
        continue;
      }

      const res = await fetchText(safeUrl);
      if (!res.ok || !res.text) continue;

      const extracted = extractReadableText(res.text);
      const text = extracted.text;
      if (!text || text.length < 200) continue;

      // Update source status with extracted count
      const domain = new URL(safeUrl).hostname;
      const sourceStatus = sourceStatuses.find(s => safeUrl.includes(new URL(s.baseUrl).hostname));
      if (sourceStatus) {
        sourceStatus.pagesExtracted++;
      }

      // Simple relevance filter
      const low = text.toLowerCase();
      const hitCount = kw.reduce((acc, k) => acc + (low.includes(k) ? 1 : 0), 0);
      if (kw.length > 0 && hitCount === 0 && !/\bipo\b/i.test(query)) continue;

      const snippet = normalizeText(text.slice(0, 800));

      items.push({
        url: safeUrl,
        title: extracted.title || new URL(safeUrl).hostname.replace('www.', ''),
        description: extracted.description || snippet.slice(0, 180),
        markdown: `# ${extracted.title || 'Source'}\n\n${snippet}\n\n---\n\nSource: ${safeUrl}`,
        fetchedAt: new Date().toISOString(),
        sourceStatus: 'success',
      });
    }

    // Final strict mode check - must have actual extracted content
    if (strictMode && items.length < Math.min(minSources, limit)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Strict Mode: Only ${items.length} pages with relevant content found (minimum ${Math.min(minSources, limit)} required)`,
          strictModeFailure: true,
          sourceStatuses,
          extractedCount: items.length,
          unreachableSources: sourceStatuses.filter(s => s.status !== 'success').map(s => ({
            name: s.name,
            url: s.baseUrl,
            reason: s.error || s.status,
            responseTime: s.responseTime
          })),
          recommendations: [
            'The query may be too specific - try broader search terms',
            'Some sources may not have content matching your query',
            'Disable strict mode to get partial results'
          ]
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[research-search] SUCCESS', { 
      itemsFound: items.length, 
      sourcesReached: successfulSources,
      strictMode 
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: items,
        totalResults: items.length,
        searchMethod: 'internal_fetch',
        country: country || null,
        strictMode,
        sourceStatuses,
        summary: {
          sourcesChecked: sourceStatuses.length,
          sourcesReachable: successfulSources,
          sourcesUnreachable: sourceStatuses.length - successfulSources,
          totalPagesFound: sourceStatuses.reduce((acc, s) => acc + s.pagesFound, 0),
          totalPagesExtracted: items.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[research-search] error', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
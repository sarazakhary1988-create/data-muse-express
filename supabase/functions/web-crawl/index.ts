import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ TYPES ============
interface WebCrawlRequest {
  url: string;
  query?: string;
  maxDepth?: number;
  maxPages?: number;
  followLinks?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  extractStructured?: boolean;
  scrapeContent?: boolean;
  timeout?: number;
}

interface CrawledPage {
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
}

interface CrawlResult {
  success: boolean;
  pages: CrawledPage[];
  discoveredUrls: string[];
  crawledCount: number;
  failedCount: number;
  totalTime: number;
  rootDomain: string;
  error?: string;
}

// ============ CONFIGURATION ============
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_PAGES_DEFAULT = 20;
const MAX_DEPTH_DEFAULT = 3;
const CONCURRENT_REQUESTS = 4;
const DELAY_BETWEEN_REQUESTS = 200;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const BLOCKED_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'pinterest.com', 'youtube.com',
];

const BLOCKED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.tar', '.gz', '.exe', '.dmg', '.pkg',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
  '.css', '.js', '.json', '.xml', '.rss', '.atom',
];

// ============ HELPERS ============
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    // Handle relative URLs
    const resolved = new URL(url, baseUrl);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(resolved.protocol)) return null;
    
    // Remove fragments and trailing slashes
    resolved.hash = '';
    let normalized = resolved.toString();
    if (normalized.endsWith('/') && normalized.split('/').length > 4) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch {
    return null;
  }
}

function isDomainMatch(url: string, rootDomain: string): boolean {
  try {
    const urlDomain = new URL(url).hostname.toLowerCase().replace('www.', '');
    return urlDomain === rootDomain || urlDomain.endsWith('.' + rootDomain);
  } catch {
    return false;
  }
}

function shouldSkipUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // Skip blocked extensions
  for (const ext of BLOCKED_EXTENSIONS) {
    if (urlLower.includes(ext)) return true;
  }
  
  // Skip blocked domains
  for (const domain of BLOCKED_DOMAINS) {
    if (urlLower.includes(domain)) return true;
  }
  
  // Skip common non-content paths
  const skipPatterns = [
    '/login', '/logout', '/signin', '/signup', '/register',
    '/cart', '/checkout', '/account', '/admin',
    '/wp-admin', '/wp-login', '/feed/', '/rss',
    '/print/', '/share/', '/email/', '/mailto:',
    '#', 'javascript:', 'tel:', 'sms:',
  ];
  
  for (const pattern of skipPatterns) {
    if (urlLower.includes(pattern)) return true;
  }
  
  return false;
}

function matchesPattern(url: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  
  return patterns.some(pattern => {
    // Simple glob-like matching
    const regex = new RegExp(
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*'),
      'i'
    );
    return regex.test(url);
  });
}

// ============ FETCH WITH TIMEOUT ============
async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; html: string; responseTime: number; error?: string; headers?: Record<string, string> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();
  
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'DNT': '1',
      }
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    if (!resp.ok) {
      return { ok: false, status: resp.status, html: '', responseTime, error: `HTTP ${resp.status}` };
    }

    // Check content type
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { ok: false, status: resp.status, html: '', responseTime, error: 'Not HTML content' };
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder('utf-8').decode(sliced);

    const headers: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      if (['content-type', 'last-modified', 'content-language'].includes(k.toLowerCase())) {
        headers[k] = v;
      }
    });

    return { ok: true, status: resp.status, html, responseTime, headers };
  } catch (e) {
    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;
    const error = e instanceof Error ? e.message : 'Unknown error';
    const isTimeout = error.includes('abort');
    return { ok: false, status: 0, html: '', responseTime, error: isTimeout ? 'Timeout' : error };
  }
}

// ============ CONTENT EXTRACTION ============
function extractContent(html: string, url: string): {
  title: string;
  description: string;
  markdown: string;
  links: string[];
  wordCount: number;
  metadata: CrawledPage['metadata'];
} {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return { title: '', description: '', markdown: '', links: [], wordCount: 0, metadata: {} };

  // Extract title
  const title = (
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('h1')?.textContent ||
    doc.querySelector('title')?.textContent || ''
  ).trim().replace(/\s+/g, ' ');

  // Extract description
  const description = (
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  ).trim().replace(/\s+/g, ' ');

  // Extract metadata
  const metadata: CrawledPage['metadata'] = {
    author: doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
            doc.querySelector('[rel="author"]')?.textContent?.trim() || undefined,
    publishDate: doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                 doc.querySelector('time[datetime]')?.getAttribute('datetime') || undefined,
    language: doc.querySelector('html')?.getAttribute('lang') || 
              doc.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') || undefined,
  };

  // Remove noise
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer',
    'aside', 'header', '.advertisement', '.ad', '.social', '.comment',
    '.sidebar', '.widget', '.popup', '.modal', '.cookie',
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

  const text = (mainContent?.textContent || '').trim().replace(/\s+/g, ' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Extract links
  const links: string[] = [];
  const seenLinks = new Set<string>();
  
  doc.querySelectorAll('a[href]').forEach((a: any) => {
    const href = a.getAttribute('href');
    if (!href) return;
    
    const normalized = normalizeUrl(href, url);
    if (normalized && !seenLinks.has(normalized) && !shouldSkipUrl(normalized)) {
      seenLinks.add(normalized);
      links.push(normalized);
    }
  });

  // Build markdown
  const markdownParts: string[] = [];
  if (title) markdownParts.push(`# ${title}\n`);
  if (description) markdownParts.push(`*${description}*\n`);
  markdownParts.push(`\n${text.slice(0, 10000)}\n`);

  return {
    title,
    description,
    markdown: markdownParts.join('\n'),
    links,
    wordCount,
    metadata,
  };
}

// ============ SITEMAP DISCOVERY ============
async function discoverFromSitemap(rootUrl: string, maxUrls: number): Promise<string[]> {
  const urls: string[] = [];
  const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/sitemap/sitemap.xml'];
  
  for (const path of sitemapPaths) {
    if (urls.length >= maxUrls) break;
    
    try {
      const sitemapUrl = new URL(path, rootUrl).toString();
      console.log(`[web-crawl] Checking sitemap: ${sitemapUrl}`);
      
      const resp = await fetchWithTimeout(sitemapUrl, 10000);
      if (!resp.ok) continue;
      
      // Extract URLs from sitemap
      const locMatches = resp.html.matchAll(/<loc>([^<]+)<\/loc>/gi);
      for (const match of locMatches) {
        if (urls.length >= maxUrls) break;
        const loc = match[1].trim();
        if (loc.startsWith('http') && !urls.includes(loc)) {
          urls.push(loc);
        }
      }
      
      console.log(`[web-crawl] Found ${urls.length} URLs in sitemap`);
      break; // Found a working sitemap
    } catch (e) {
      console.warn(`[web-crawl] Sitemap error:`, e);
    }
  }
  
  return urls;
}

// ============ ROBOTS.TXT CHECK ============
async function getRobotsTxtDisallowed(rootUrl: string): Promise<string[]> {
  const disallowed: string[] = [];
  
  try {
    const robotsUrl = new URL('/robots.txt', rootUrl).toString();
    const resp = await fetchWithTimeout(robotsUrl, 5000);
    
    if (resp.ok) {
      const lines = resp.html.split('\n');
      let isUserAgentAll = false;
      
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith('user-agent:')) {
          isUserAgentAll = trimmed.includes('*');
        } else if (isUserAgentAll && trimmed.startsWith('disallow:')) {
          const path = trimmed.replace('disallow:', '').trim();
          if (path && path !== '/') {
            disallowed.push(path);
          }
        }
      }
    }
  } catch { /* ignore */ }
  
  return disallowed;
}

// ============ MAIN CRAWL FUNCTION ============
async function crawlWebsite(
  startUrl: string,
  options: WebCrawlRequest
): Promise<CrawlResult> {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? MAX_DEPTH_DEFAULT;
  const maxPages = Math.min(options.maxPages ?? MAX_PAGES_DEFAULT, 50);
  const followLinks = options.followLinks !== false;
  const includePatterns = options.includePatterns || [];
  const excludePatterns = options.excludePatterns || [];
  
  // Parse root domain
  let rootDomain: string;
  try {
    rootDomain = new URL(startUrl).hostname.toLowerCase().replace('www.', '');
  } catch {
    return {
      success: false,
      pages: [],
      discoveredUrls: [],
      crawledCount: 0,
      failedCount: 0,
      totalTime: Date.now() - startTime,
      rootDomain: '',
      error: 'Invalid start URL',
    };
  }
  
  console.log(`[web-crawl] Starting crawl of ${rootDomain}, maxDepth=${maxDepth}, maxPages=${maxPages}`);
  
  // State
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
  const pages: CrawledPage[] = [];
  const discoveredUrls: string[] = [];
  let failedCount = 0;
  
  // Try to discover URLs from sitemap first
  if (followLinks) {
    const sitemapUrls = await discoverFromSitemap(startUrl, maxPages * 2);
    for (const url of sitemapUrls) {
      if (!visited.has(url) && isDomainMatch(url, rootDomain)) {
        discoveredUrls.push(url);
        if (queue.length < maxPages) {
          queue.push({ url, depth: 1 });
        }
      }
    }
    console.log(`[web-crawl] Added ${sitemapUrls.length} URLs from sitemap`);
  }
  
  // Get robots.txt disallowed paths
  const disallowed = await getRobotsTxtDisallowed(startUrl);
  console.log(`[web-crawl] Robots.txt disallowed paths: ${disallowed.length}`);
  
  // Process queue in batches
  while (queue.length > 0 && pages.length < maxPages) {
    // Get batch
    const batch = queue.splice(0, Math.min(CONCURRENT_REQUESTS, maxPages - pages.length));
    
    // Filter already visited
    const toProcess = batch.filter(item => {
      if (visited.has(item.url)) return false;
      if (item.depth > maxDepth) return false;
      
      // Check against robots.txt
      try {
        const urlPath = new URL(item.url).pathname;
        if (disallowed.some(d => urlPath.startsWith(d))) {
          console.log(`[web-crawl] Skipping (robots.txt): ${item.url}`);
          return false;
        }
      } catch { return false; }
      
      // Check include/exclude patterns
      if (includePatterns.length > 0 && !matchesPattern(item.url, includePatterns)) return false;
      if (excludePatterns.length > 0 && matchesPattern(item.url, excludePatterns)) return false;
      
      visited.add(item.url);
      return true;
    });
    
    if (toProcess.length === 0) continue;
    
    // Fetch in parallel
    const promises = toProcess.map(async (item) => {
      console.log(`[web-crawl] Fetching (depth ${item.depth}): ${item.url}`);
      
      const result = await fetchWithTimeout(item.url, options.timeout || REQUEST_TIMEOUT_MS);
      
      if (!result.ok) {
        failedCount++;
        return {
          url: item.url,
          title: '',
          description: '',
          markdown: '',
          links: [],
          depth: item.depth,
          status: result.error?.includes('Timeout') ? 'timeout' : 'failed',
          error: result.error,
          responseTime: result.responseTime,
          wordCount: 0,
          metadata: {},
        } as CrawledPage;
      }
      
      const extracted = extractContent(result.html, item.url);
      
      // Add discovered links to queue
      if (followLinks && item.depth < maxDepth) {
        for (const link of extracted.links) {
          if (!visited.has(link) && 
              isDomainMatch(link, rootDomain) && 
              !discoveredUrls.includes(link)) {
            discoveredUrls.push(link);
            queue.push({ url: link, depth: item.depth + 1 });
          }
        }
      }
      
      return {
        url: item.url,
        title: extracted.title,
        description: extracted.description,
        markdown: options.scrapeContent !== false ? extracted.markdown : '',
        links: extracted.links.slice(0, 50),
        depth: item.depth,
        status: 'success',
        responseTime: result.responseTime,
        wordCount: extracted.wordCount,
        metadata: {
          ...extracted.metadata,
          contentType: result.headers?.['content-type'],
        },
      } as CrawledPage;
    });
    
    const results = await Promise.all(promises);
    pages.push(...results);
    
    // Rate limiting
    if (queue.length > 0 && pages.length < maxPages) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`[web-crawl] Complete: ${pages.length} pages, ${failedCount} failed, ${totalTime}ms`);
  
  return {
    success: true,
    pages,
    discoveredUrls: discoveredUrls.slice(0, 200),
    crawledCount: pages.filter(p => p.status === 'success').length,
    failedCount,
    totalTime,
    rootDomain,
  };
}

// ============ QUERY-FOCUSED CRAWL ============
async function queryFocusedCrawl(
  startUrl: string,
  query: string,
  options: WebCrawlRequest
): Promise<CrawlResult> {
  console.log(`[web-crawl] Query-focused crawl for: "${query}"`);
  
  // First, do a regular crawl
  const crawlResult = await crawlWebsite(startUrl, {
    ...options,
    maxPages: Math.min((options.maxPages || 20) * 2, 50), // Crawl more, filter later
  });
  
  if (!crawlResult.success || crawlResult.pages.length === 0) {
    return crawlResult;
  }
  
  // Score pages by query relevance
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  const scoredPages = crawlResult.pages
    .filter(p => p.status === 'success')
    .map(page => {
      let score = 0;
      const content = (page.title + ' ' + page.description + ' ' + page.markdown).toLowerCase();
      
      for (const term of queryTerms) {
        // Count occurrences
        const matches = (content.match(new RegExp(term, 'gi')) || []).length;
        score += matches * 2;
        
        // Bonus for title matches
        if (page.title.toLowerCase().includes(term)) score += 10;
        
        // Bonus for URL matches
        if (page.url.toLowerCase().includes(term)) score += 5;
      }
      
      // Normalize by content length
      score = page.wordCount > 0 ? score / Math.log(page.wordCount + 1) : 0;
      
      return { page, score };
    })
    .sort((a, b) => b.score - a.score);
  
  // Keep top relevant pages
  const relevantPages = scoredPages
    .filter(p => p.score > 0)
    .slice(0, options.maxPages || 20)
    .map(p => p.page);
  
  console.log(`[web-crawl] Query filtering: ${crawlResult.pages.length} -> ${relevantPages.length} relevant pages`);
  
  return {
    ...crawlResult,
    pages: relevantPages.length > 0 ? relevantPages : crawlResult.pages.slice(0, options.maxPages || 20),
    crawledCount: relevantPages.length,
  };
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json() as WebCrawlRequest;
    
    if (!body.url || typeof body.url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = body.url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log(`[web-crawl] Request: ${formattedUrl}, query: "${body.query || 'none'}"`);

    let result: CrawlResult;
    
    if (body.query && body.query.trim().length > 0) {
      // Query-focused crawl
      result = await queryFocusedCrawl(formattedUrl, body.query, body);
    } else {
      // Standard crawl
      result = await crawlWebsite(formattedUrl, body);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[web-crawl] Complete: ${result.crawledCount} pages in ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        ...result,
        timing: { total: totalTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[web-crawl] error:', e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Crawl failed',
        pages: [],
        discoveredUrls: [],
        crawledCount: 0,
        failedCount: 0,
        totalTime: Date.now() - startTime,
        rootDomain: '',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

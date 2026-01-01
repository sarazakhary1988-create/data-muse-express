import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
  extractStructured?: boolean;
}

// ============ CONFIGURATION ============
const MAX_URL_LENGTH = 2048;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

// Rotating user agents for better success rate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

// ============ URL VALIDATION ============
function validateUrl(url: string): { ok: boolean; error?: string; formatted?: string } {
  if (!url || typeof url !== 'string') return { ok: false, error: 'URL is required' };
  if (url.length > MAX_URL_LENGTH) return { ok: false, error: `URL too long (>${MAX_URL_LENGTH})` };

  try {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    const parsed = new URL(formatted);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: 'Only HTTP/HTTPS URLs are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) return { ok: false, error: 'URL not allowed' };
    for (const p of BLOCKED_IP_PATTERNS) {
      if (p.test(hostname)) return { ok: false, error: 'URL not allowed' };
    }

    return { ok: true, formatted: parsed.toString() };
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
}

// ============ HTML FETCHING WITH RETRIES ============
async function fetchHtml(url: string, retries = MAX_RETRIES): Promise<{ 
  ok: boolean; 
  status: number; 
  html: string; 
  responseTime: number;
  headers?: Record<string, string>;
  error?: string;
}> {
  const startTime = Date.now();
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.log(`[scrape] Attempt ${attempt + 1}/${retries + 1} for ${url}`);
      
      const resp = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
        }
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      if (!resp.ok) {
        if (attempt < retries && (resp.status === 429 || resp.status >= 500)) {
          console.log(`[scrape] Retrying after ${resp.status}...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return { ok: false, status: resp.status, html: '', responseTime, error: `HTTP ${resp.status}` };
      }

      const buf = new Uint8Array(await resp.arrayBuffer());
      const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
      const html = new TextDecoder('utf-8').decode(sliced);

      // Extract relevant headers
      const headers: Record<string, string> = {};
      resp.headers.forEach((v, k) => {
        if (['content-type', 'last-modified', 'etag', 'x-robots-tag'].includes(k.toLowerCase())) {
          headers[k] = v;
        }
      });

      console.log(`[scrape] Success: ${html.length} bytes in ${responseTime}ms`);
      return { ok: true, status: resp.status, html, responseTime, headers };
      
    } catch (e) {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      
      if (attempt < retries) {
        console.log(`[scrape] Retry after error: ${errorMsg}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      
      const isTimeout = errorMsg.includes('abort') || responseTime >= REQUEST_TIMEOUT_MS - 500;
      return { 
        ok: false, 
        status: 0, 
        html: '', 
        responseTime,
        error: isTimeout ? 'Request timeout' : errorMsg
      };
    }
  }
  
  return { ok: false, status: 0, html: '', responseTime: Date.now() - startTime, error: 'Max retries exceeded' };
}

// ============ TEXT NORMALIZATION ============
function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// ============ READABILITY-STYLE CONTENT SCORING ============
function scoreElement(el: Element, depth: number = 0): number {
  let score = 0;
  const tagName = el.tagName?.toLowerCase() || '';
  const className = el.className?.toLowerCase() || '';
  const id = el.id?.toLowerCase() || '';

  // Positive signals (main content)
  if (['article', 'main', 'section'].includes(tagName)) score += 25;
  if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) score += 5;
  if (/content|article|body|main|post|text|story|entry/i.test(className + ' ' + id)) score += 15;
  
  // Negative signals (boilerplate)
  if (['nav', 'footer', 'aside', 'header', 'menu'].includes(tagName)) score -= 30;
  if (/sidebar|widget|comment|footer|header|nav|menu|ad|advertisement|social|share|related|popup|modal|banner/i.test(className + ' ' + id)) score -= 20;
  
  // Depth penalty (content is usually not deeply nested)
  score -= depth * 2;
  
  // Text density bonus
  const text = el.textContent || '';
  const linkText = Array.from(el.querySelectorAll('a')).map(a => a.textContent || '').join('');
  const textRatio = text.length > 0 ? (text.length - linkText.length) / text.length : 0;
  if (textRatio > 0.5 && text.length > 100) score += 10;
  
  return score;
}

function findMainContent(doc: any): Element | null {
  // Priority candidates
  const prioritySelectors = [
    'article[role="main"]',
    'main article',
    'article.content',
    'article.post',
    'article',
    'main',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    '#content',
    '.main-content',
    '#main-content',
  ];

  for (const selector of prioritySelectors) {
    const el = doc.querySelector(selector);
    if (el) {
      const text = el.textContent?.trim() || '';
      if (text.length > 200) {
        return el;
      }
    }
  }

  // Fallback: score all divs and sections
  const candidates: { el: Element; score: number }[] = [];
  const elements = doc.querySelectorAll('div, section, article');
  
  for (const el of elements) {
    const text = el.textContent?.trim() || '';
    if (text.length < 200) continue;
    
    const paragraphs = el.querySelectorAll('p');
    if (paragraphs.length < 2) continue;
    
    const score = scoreElement(el as Element, 0);
    candidates.push({ el: el as Element, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.el || doc.body;
}

// ============ CONTENT EXTRACTION (READABILITY-STYLE) ============
function extractContent(html: string, onlyMainContent: boolean): { 
  title: string; 
  description: string; 
  markdown: string; 
  links: string[];
  images: string[];
  headings: string[];
  publishDate?: string;
  author?: string;
  wordCount: number;
} {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return { title: '', description: '', markdown: '', links: [], images: [], headings: [], wordCount: 0 };

  // Extract metadata
  const title = normalizeText(
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('h1')?.textContent ||
    doc.querySelector('title')?.textContent || ''
  );
  
  const description = normalizeText(
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  );

  const publishDate = 
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
    doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
    doc.querySelector('[class*="date"], [class*="publish"]')?.textContent?.trim();

  const author = 
    doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
    doc.querySelector('[rel="author"]')?.textContent?.trim() ||
    doc.querySelector('[class*="author"]')?.textContent?.trim();

  // Find main content area
  let root: any;
  if (onlyMainContent) {
    root = findMainContent(doc);
  } else {
    root = doc.body;
  }

  if (!root) return { title, description, markdown: '', links: [], images: [], headings: [], wordCount: 0 };

  // Remove noise elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
    '[role="complementary"]', '[role="banner"]', '[role="navigation"]',
    '.advertisement', '.ad', '.ads', '.social-share', '.comments',
    '.sidebar', '.widget', '.popup', '.modal', '.cookie-notice',
    'nav', 'footer', 'aside', 'header:not(article header)',
  ];
  
  if (onlyMainContent) {
    for (const sel of removeSelectors) {
      try {
        root.querySelectorAll(sel).forEach((n: any) => n.remove());
      } catch { /* selector might not be valid */ }
    }
  }

  // Extract headings
  const headings: string[] = [];
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h: any) => {
    const text = normalizeText(h.textContent || '');
    if (text.length > 3 && text.length < 200) {
      headings.push(text);
    }
  });

  // Extract images with alt text
  const images: string[] = [];
  root.querySelectorAll('img[src]').forEach((img: any) => {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt') || '';
    if (src && src.startsWith('http')) {
      images.push(alt ? `${alt}: ${src}` : src);
    }
  });

  // Extract and clean text
  const text = normalizeText(root.textContent || '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Extract links with context
  const links: { href: string; text: string }[] = [];
  root.querySelectorAll('a[href]').forEach((a: any) => {
    const href = a.getAttribute('href');
    const text = normalizeText(a.textContent || '');
    if (href && href.startsWith('http') && text.length > 2 && text.length < 100) {
      links.push({ href, text });
    }
  });

  // Build markdown output
  const markdownParts: string[] = [];
  
  if (title) markdownParts.push(`# ${title}\n`);
  if (description) markdownParts.push(`*${description}*\n`);
  if (author || publishDate) {
    const meta = [author && `By: ${author}`, publishDate && `Published: ${publishDate}`].filter(Boolean).join(' | ');
    markdownParts.push(`> ${meta}\n`);
  }
  
  markdownParts.push('\n---\n');
  
  // Add headings structure
  if (headings.length > 0 && headings.length <= 15) {
    markdownParts.push('\n**Contents:**\n');
    headings.slice(0, 10).forEach(h => markdownParts.push(`- ${h}`));
    markdownParts.push('\n---\n');
  }
  
  // Main content (limited to reasonable size)
  const contentSnippet = text.slice(0, 12000);
  markdownParts.push(`\n${contentSnippet}\n`);

  // Notable links
  const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()].slice(0, 30);
  if (uniqueLinks.length > 0) {
    markdownParts.push('\n---\n\n**Related Links:**\n');
    uniqueLinks.slice(0, 15).forEach(l => {
      markdownParts.push(`- [${l.text}](${l.href})`);
    });
  }

  return { 
    title, 
    description, 
    markdown: markdownParts.join('\n'),
    links: uniqueLinks.map(l => l.href),
    images: images.slice(0, 20),
    headings,
    publishDate,
    author,
    wordCount,
  };
}

// ============ STRUCTURED DATA EXTRACTION ============
function extractStructuredData(html: string): Record<string, any> {
  const data: Record<string, any> = {};
  
  // JSON-LD
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      data.jsonLd = JSON.parse(jsonLdMatch[1]);
    } catch { /* ignore parsing errors */ }
  }

  // OpenGraph
  const ogData: Record<string, string> = {};
  const ogRegex = /<meta[^>]+property=["']og:([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    ogData[match[1]] = match[2];
  }
  if (Object.keys(ogData).length > 0) {
    data.openGraph = ogData;
  }

  // Twitter Card
  const twitterData: Record<string, string> = {};
  const twitterRegex = /<meta[^>]+name=["']twitter:([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  while ((match = twitterRegex.exec(html)) !== null) {
    twitterData[match[1]] = match[2];
  }
  if (Object.keys(twitterData).length > 0) {
    data.twitter = twitterData;
  }

  return data;
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  
  try {
    const body = await req.json() as ScrapeRequest;
    const url = body.url;

    const v = validateUrl(url);
    if (!v.ok || !v.formatted) {
      return new Response(
        JSON.stringify({ success: false, error: v.error || 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const onlyMainContent = typeof body.onlyMainContent === 'boolean' ? body.onlyMainContent : true;
    const extractStructured = body.extractStructured === true;

    console.log(`[research-scrape] Starting: ${v.formatted}`);

    const res = await fetchHtml(v.formatted);
    
    if (!res.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: res.error || `Failed to fetch (status ${res.status})`,
          responseTime: res.responseTime,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = extractContent(res.html, onlyMainContent);
    const structured = extractStructured ? extractStructuredData(res.html) : undefined;

    const totalTime = Date.now() - startTime;
    console.log(`[research-scrape] Complete: ${extracted.wordCount} words in ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          markdown: extracted.markdown,
          links: extracted.links,
          images: extracted.images,
          headings: extracted.headings,
          metadata: {
            title: extracted.title,
            description: extracted.description,
            author: extracted.author,
            publishDate: extracted.publishDate,
            sourceURL: v.formatted,
            statusCode: res.status,
            wordCount: extracted.wordCount,
            responseTime: res.responseTime,
            headers: res.headers,
          },
          structured,
        },
        timing: {
          fetch: res.responseTime,
          total: totalTime,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[research-scrape] error', e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Scrape failed',
        timing: { total: Date.now() - startTime }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

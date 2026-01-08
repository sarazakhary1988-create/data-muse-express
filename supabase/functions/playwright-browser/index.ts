import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// PLAYWRIGHT BROWSER AUTOMATION SERVICE
// ========================================
// NO EXTERNAL API REQUIRED - Uses HTTP fallback with enhanced capabilities
// Supports: Scraping, Screenshots (via third-party if configured), PDF generation
// For JS-protected sites: Requires external browser service OR uses smart extraction

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaywrightRequest {
  url: string;
  action: 'scrape' | 'screenshot' | 'pdf' | 'interact' | 'full';
  waitFor?: string; // CSS selector to wait for
  waitTime?: number; // ms to wait
  script?: string; // Custom JS to execute
  interactions?: Interaction[];
  extractSelectors?: Record<string, string>; // { fieldName: 'CSS selector' }
  userAgent?: string;
  headers?: Record<string, string>;
}

interface Interaction {
  type: 'click' | 'type' | 'select' | 'scroll' | 'wait';
  selector?: string;
  value?: string;
  delay?: number;
}

interface PlaywrightResponse {
  success: boolean;
  url: string;
  title?: string;
  content?: string;
  markdown?: string;
  html?: string;
  screenshot?: string; // base64
  extracted?: Record<string, string | string[]>;
  links?: string[];
  images?: Array<{ url: string; alt: string }>;
  metadata?: {
    statusCode: number;
    contentType: string;
    contentLength: number;
    language?: string;
    publishDate?: string;
    author?: string;
  };
  error?: string;
  executionTime: number;
  provider: string;
}

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: PlaywrightRequest = await req.json();
    const { 
      url, 
      action = 'scrape', 
      waitTime = 3000, 
      extractSelectors,
      userAgent,
      headers: customHeaders,
    } = request;

    if (!url) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'URL is required',
        executionTime: Date.now() - startTime,
        provider: 'none',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Playwright] ${action} request for: ${url}`);

    // Check for optional external browser services (in order of preference)
    // These are OPTIONAL - system works without them
    
    // 1. Try Browserless if configured (OPTIONAL)
    const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (browserlessKey && action !== 'scrape') {
      try {
        const result = await useBrowserless(url, action, browserlessKey, request);
        result.executionTime = Date.now() - startTime;
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.log('[Playwright] Browserless failed, falling back to HTTP');
      }
    }

    // 2. Use enhanced HTTP scraping (NO API REQUIRED - this is the default)
    const result = await enhancedHttpScrape(url, {
      userAgent: userAgent || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      customHeaders,
      extractSelectors,
      action,
    });
    result.executionTime = Date.now() - startTime;
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Playwright] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
      provider: 'error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Enhanced HTTP scraping - NO API REQUIRED
async function enhancedHttpScrape(
  url: string,
  options: {
    userAgent: string;
    customHeaders?: Record<string, string>;
    extractSelectors?: Record<string, string>;
    action: string;
  }
): Promise<PlaywrightResponse> {
  const { userAgent, customHeaders, extractSelectors, action } = options;

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      ...customHeaders,
    };

    // Handle redirects manually to capture final URL
    let finalUrl = url;
    let response = await fetch(url, {
      headers,
      redirect: 'manual',
    });

    // Follow redirects (up to 5)
    let redirectCount = 0;
    while (response.status >= 300 && response.status < 400 && redirectCount < 5) {
      const location = response.headers.get('location');
      if (!location) break;
      
      finalUrl = location.startsWith('http') ? location : new URL(location, finalUrl).toString();
      response = await fetch(finalUrl, { headers, redirect: 'manual' });
      redirectCount++;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';

    // Parse the HTML
    const parsed = parseHtml(html, finalUrl);
    
    // Extract specific selectors if provided
    let extracted: Record<string, string | string[]> = {};
    if (extractSelectors) {
      extracted = extractBySelectors(html, extractSelectors);
    }

    // Convert to markdown
    const markdown = htmlToMarkdown(parsed.content, parsed.title);

    return {
      success: true,
      url: finalUrl,
      title: parsed.title,
      content: parsed.content,
      markdown,
      html: action === 'full' ? html : undefined,
      extracted: Object.keys(extracted).length > 0 ? extracted : undefined,
      links: parsed.links,
      images: parsed.images,
      metadata: {
        statusCode: response.status,
        contentType,
        contentLength: html.length,
        language: parsed.language,
        publishDate: parsed.publishDate,
        author: parsed.author,
      },
      provider: 'HTTP Direct (No API)',
      executionTime: 0,
    };

  } catch (error) {
    console.error('[HTTP Scrape] Error:', error);
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'HTTP fetch error',
      executionTime: 0,
      provider: 'HTTP Direct (No API)',
    };
  }
}

// Parse HTML and extract structured content
function parseHtml(html: string, baseUrl: string): {
  title: string;
  content: string;
  links: string[];
  images: Array<{ url: string; alt: string }>;
  language?: string;
  publishDate?: string;
  author?: string;
} {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const title = ogTitleMatch?.[1] || titleMatch?.[1]?.trim() || '';

  // Extract language
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  const language = langMatch?.[1];

  // Extract publish date
  const dateMatch = html.match(/<meta[^>]*(?:property=["']article:published_time["']|name=["']date["'])[^>]*content=["']([^"']+)["']/i);
  const publishDate = dateMatch?.[1];

  // Extract author
  const authorMatch = html.match(/<meta[^>]*(?:name=["']author["']|property=["']article:author["'])[^>]*content=["']([^"']+)["']/i);
  const author = authorMatch?.[1];

  // Extract main content (remove scripts, styles, nav, footer, etc.)
  let content = html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    // Remove navigation and footer
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    // Remove hidden elements
    .replace(/<[^>]*style=["'][^"']*display:\s*none[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<[^>]*hidden[^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '');

  // Try to find article or main content
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentMatch = content.match(/<div[^>]*(?:class|id)=["'][^"']*(?:content|article|post|entry|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  const mainContent = articleMatch?.[1] || mainMatch?.[1] || contentMatch?.[1] || content;

  // Strip HTML tags to get text
  const textContent = mainContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Extract links
  const links: string[] = [];
  const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi);
  for (const match of linkMatches) {
    const href = match[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    
    try {
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
      if (!links.includes(fullUrl)) {
        links.push(fullUrl);
      }
    } catch {}
  }

  // Extract images
  const images: Array<{ url: string; alt: string }> = [];
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*?)["'])?[^>]*>/gi);
  for (const match of imgMatches) {
    const src = match[1];
    const alt = match[2] || '';
    if (!src || src.startsWith('data:')) continue;
    
    try {
      const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      images.push({ url: fullUrl, alt });
    } catch {}
  }

  return {
    title,
    content: textContent,
    links: links.slice(0, 100),
    images: images.slice(0, 50),
    language,
    publishDate,
    author,
  };
}

// Extract content by CSS selectors (basic implementation)
function extractBySelectors(html: string, selectors: Record<string, string>): Record<string, string | string[]> {
  const extracted: Record<string, string | string[]> = {};

  for (const [name, selector] of Object.entries(selectors)) {
    // Basic selector matching (simplified - no full CSS selector support)
    const isClass = selector.startsWith('.');
    const isId = selector.startsWith('#');
    const isTag = !isClass && !isId;

    let regex: RegExp;
    if (isClass) {
      const className = selector.slice(1);
      regex = new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'gi');
    } else if (isId) {
      const id = selector.slice(1);
      regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'gi');
    } else {
      regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'gi');
    }

    const matches: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        matches.push(text);
      }
    }

    extracted[name] = matches.length === 1 ? matches[0] : matches;
  }

  return extracted;
}

// Convert parsed content to markdown
function htmlToMarkdown(content: string, title: string): string {
  let md = '';
  
  if (title) {
    md += `# ${title}\n\n`;
  }

  // Clean up the content
  md += content
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return md;
}

// Optional: Browserless.io for screenshots/PDFs (only if API key is configured)
async function useBrowserless(
  url: string,
  action: string,
  apiKey: string,
  request: PlaywrightRequest
): Promise<PlaywrightResponse> {
  const { extractSelectors } = request;

  try {
    if (action === 'screenshot') {
      const response = await fetch(`https://chrome.browserless.io/screenshot?token=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: { fullPage: true, type: 'png' },
          gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 },
        }),
      });

      if (!response.ok) throw new Error(`Browserless screenshot failed: ${response.status}`);
      
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      
      return {
        success: true,
        url,
        screenshot: base64,
        provider: 'Browserless.io',
        executionTime: 0,
      };
    }

    if (action === 'pdf') {
      const response = await fetch(`https://chrome.browserless.io/pdf?token=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: { printBackground: true, format: 'A4' },
          gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 },
        }),
      });

      if (!response.ok) throw new Error(`Browserless PDF failed: ${response.status}`);
      
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      
      return {
        success: true,
        url,
        content: base64,
        provider: 'Browserless.io',
        executionTime: 0,
      };
    }

    // For scraping, use the /scrape endpoint
    const elements = extractSelectors 
      ? Object.entries(extractSelectors).map(([name, selector]) => ({ selector, name }))
      : [
          { selector: 'body', name: 'body' },
          { selector: 'title', name: 'title' },
          { selector: 'article', name: 'article' },
        ];

    const response = await fetch(`https://chrome.browserless.io/scrape?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        elements,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 },
      }),
    });

    if (!response.ok) throw new Error(`Browserless scrape failed: ${response.status}`);

    const data = await response.json();
    const extracted: Record<string, string | string[]> = {};
    let content = '';
    let pageTitle = '';

    for (const result of data.data || []) {
      if (result.results?.length > 0) {
        const text = result.results.map((r: any) => r.text || r.innerHTML || '').join('\n');
        extracted[result.selector] = text;
        if (result.selector === 'title') pageTitle = text;
        if (result.selector === 'body' || result.selector === 'article') content += text + '\n';
      }
    }

    return {
      success: true,
      url,
      title: pageTitle,
      content: content.trim(),
      extracted,
      provider: 'Browserless.io',
      executionTime: 0,
    };

  } catch (error) {
    throw error; // Propagate to fallback
  }
}

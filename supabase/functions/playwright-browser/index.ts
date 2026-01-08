import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// PLAYWRIGHT BROWSER AUTOMATION SERVICE
// ========================================
// Uses BrowserBase or Browserless.io for real Playwright browser automation
// Supports JS-protected sites like cma.gov.sa
// Manus 1.7 MAX compatible

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaywrightRequest {
  url: string;
  action: 'scrape' | 'screenshot' | 'pdf' | 'interact';
  waitFor?: string; // CSS selector to wait for
  waitTime?: number; // ms to wait
  script?: string; // Custom JS to execute
  interactions?: Interaction[];
  extractSelectors?: Record<string, string>; // { fieldName: 'CSS selector' }
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
  html?: string;
  screenshot?: string; // base64
  extracted?: Record<string, string>;
  links?: string[];
  error?: string;
  executionTime: number;
  provider: string;
}

// Provider configurations
const PROVIDERS = {
  browserless: {
    name: 'Browserless.io',
    scrapeEndpoint: 'https://chrome.browserless.io/scrape',
    contentEndpoint: 'https://chrome.browserless.io/content',
    screenshotEndpoint: 'https://chrome.browserless.io/screenshot',
    pdfEndpoint: 'https://chrome.browserless.io/pdf',
    apiKeyEnv: 'BROWSERLESS_API_KEY',
  },
  browserbase: {
    name: 'BrowserBase',
    endpoint: 'https://www.browserbase.com/v1/sessions',
    apiKeyEnv: 'BROWSERBASE_API_KEY',
  },
  // Fallback to simple fetch for non-JS sites
  fallback: {
    name: 'HTTP Fetch (Fallback)',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: PlaywrightRequest = await req.json();
    const { url, action = 'scrape', waitFor, waitTime = 3000, interactions, extractSelectors } = request;

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

    // Try Browserless first (most common)
    const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (browserlessKey) {
      const result = await useBrowserless(url, action, browserlessKey, {
        waitFor,
        waitTime,
        extractSelectors,
      });
      result.executionTime = Date.now() - startTime;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try BrowserBase
    const browserbaseKey = Deno.env.get('BROWSERBASE_API_KEY');
    if (browserbaseKey) {
      const result = await useBrowserBase(url, action, browserbaseKey, {
        waitFor,
        waitTime,
      });
      result.executionTime = Date.now() - startTime;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback to enhanced HTTP fetch
    console.log('[Playwright] No browser service configured, using HTTP fallback');
    const result = await useHttpFallback(url);
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

// Browserless.io implementation
async function useBrowserless(
  url: string,
  action: string,
  apiKey: string,
  options: { waitFor?: string; waitTime?: number; extractSelectors?: Record<string, string> }
): Promise<PlaywrightResponse> {
  const { waitFor, waitTime = 3000, extractSelectors } = options;

  try {
    if (action === 'screenshot') {
      const response = await fetch(`https://chrome.browserless.io/screenshot?token=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: {
            fullPage: true,
            type: 'png',
          },
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000,
          },
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
          options: {
            printBackground: true,
            format: 'A4',
          },
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000,
          },
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

    // Default: scrape with content extraction
    const elements = extractSelectors 
      ? Object.entries(extractSelectors).map(([name, selector]) => ({
          selector,
          name,
        }))
      : [
          { selector: 'body', name: 'body' },
          { selector: 'title', name: 'title' },
          { selector: 'h1', name: 'h1' },
          { selector: 'article', name: 'article' },
          { selector: '.content, .main-content, #content, main', name: 'mainContent' },
        ];

    const response = await fetch(`https://chrome.browserless.io/scrape?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        elements,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000,
        },
        waitForSelector: waitFor ? { selector: waitFor, timeout: waitTime } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserless scrape failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract content from results
    const extracted: Record<string, string> = {};
    let mainContent = '';
    let pageTitle = '';

    for (const result of data.data || []) {
      if (result.results && result.results.length > 0) {
        const text = result.results.map((r: any) => r.text || r.innerHTML || '').join('\n');
        extracted[result.selector] = text;
        
        if (result.selector === 'title' || result.selector.includes('title')) {
          pageTitle = text;
        }
        if (result.selector === 'body' || result.selector.includes('content') || result.selector === 'article') {
          mainContent += text + '\n';
        }
      }
    }

    // Extract links
    const links: string[] = [];
    const linkMatches = mainContent.match(/href=["']([^"']+)["']/gi) || [];
    for (const match of linkMatches) {
      const href = match.replace(/href=["']|["']/gi, '');
      if (href.startsWith('http')) {
        links.push(href);
      }
    }

    return {
      success: true,
      url,
      title: pageTitle || url,
      content: mainContent.trim(),
      extracted,
      links: [...new Set(links)].slice(0, 50),
      provider: 'Browserless.io',
      executionTime: 0,
    };

  } catch (error) {
    console.error('[Browserless] Error:', error);
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'Browserless error',
      provider: 'Browserless.io',
      executionTime: 0,
    };
  }
}

// BrowserBase implementation
async function useBrowserBase(
  url: string,
  action: string,
  apiKey: string,
  options: { waitFor?: string; waitTime?: number }
): Promise<PlaywrightResponse> {
  try {
    // Create a session
    const sessionResponse = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'x-bb-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: Deno.env.get('BROWSERBASE_PROJECT_ID') || 'default',
      }),
    });

    if (!sessionResponse.ok) {
      throw new Error(`BrowserBase session creation failed: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    const sessionId = session.id;

    // Navigate and extract content
    const navigateResponse = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}/navigate`, {
      method: 'POST',
      headers: {
        'x-bb-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        waitUntil: 'networkidle',
      }),
    });

    if (!navigateResponse.ok) {
      throw new Error(`BrowserBase navigation failed: ${navigateResponse.status}`);
    }

    // Get page content
    const contentResponse = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}/content`, {
      method: 'GET',
      headers: {
        'x-bb-api-key': apiKey,
      },
    });

    const content = await contentResponse.text();

    // Close session
    await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'x-bb-api-key': apiKey,
      },
    });

    // Parse HTML to extract text
    const textContent = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract title
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    return {
      success: true,
      url,
      title,
      content: textContent,
      html: content,
      provider: 'BrowserBase',
      executionTime: 0,
    };

  } catch (error) {
    console.error('[BrowserBase] Error:', error);
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'BrowserBase error',
      provider: 'BrowserBase',
      executionTime: 0,
    };
  }
}

// HTTP fallback for non-JS sites
async function useHttpFallback(url: string): Promise<PlaywrightResponse> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML to extract text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Extract links
    const links: string[] = [];
    const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi);
    for (const match of linkMatches) {
      const href = match[1];
      if (href.startsWith('http')) {
        links.push(href);
      } else if (href.startsWith('/')) {
        try {
          const baseUrl = new URL(url);
          links.push(`${baseUrl.origin}${href}`);
        } catch {}
      }
    }

    return {
      success: true,
      url,
      title,
      content: textContent.slice(0, 50000), // Limit content size
      html,
      links: [...new Set(links)].slice(0, 100),
      provider: 'HTTP Fetch (Fallback)',
      executionTime: 0,
    };

  } catch (error) {
    console.error('[HTTP Fallback] Error:', error);
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : 'HTTP fetch error',
      provider: 'HTTP Fetch (Fallback)',
      executionTime: 0,
    };
  }
}

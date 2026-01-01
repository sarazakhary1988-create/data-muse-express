import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
}

// Input validation constants
const MAX_URL_LENGTH = 2048;
const MAX_WAIT_TIME = 30000;
const ALLOWED_FORMATS = ['markdown', 'html', 'links', 'rawHtml'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,           // 10.x.x.x
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.x.x - 172.31.x.x
  /^192\.168\.\d{1,3}\.\d{1,3}$/,               // 192.168.x.x
  /^169\.254\.\d{1,3}\.\d{1,3}$/,               // Link-local
];

function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }
  
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL must be less than ${MAX_URL_LENGTH} characters` };
  }

  let parsed: URL;
  try {
    // Add protocol if missing
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    parsed = new URL(formattedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only HTTP/HTTPS URLs are allowed' };
  }

  // Block localhost and private IPs
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname)) {
    return { valid: false, error: 'URL not allowed' };
  }

  // Check for private IP ranges
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'URL not allowed' };
    }
  }

  return { valid: true };
}

function validateFormats(formats: unknown): string[] {
  if (!Array.isArray(formats)) {
    return ['markdown', 'links'];
  }
  return formats
    .filter((f): f is string => typeof f === 'string')
    .filter(f => ALLOWED_FORMATS.includes(f))
    .slice(0, 4); // Max 4 formats
}

function validateWaitFor(waitFor: unknown): number {
  if (typeof waitFor !== 'number' || isNaN(waitFor)) {
    return 3000;
  }
  return Math.max(0, Math.min(waitFor, MAX_WAIT_TIME));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, formats, onlyMainContent, waitFor } = body as ScrapeRequest;

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      console.error('URL validation failed:', urlValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize other inputs
    const validatedFormats = validateFormats(formats);
    const validatedWaitFor = validateWaitFor(waitFor);
    const validatedOnlyMainContent = typeof onlyMainContent === 'boolean' ? onlyMainContent : true;

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('FIRECRAWL_API_KEY not configured - returning fallback indicator');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured', fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: validatedFormats,
        onlyMainContent: validatedOnlyMainContent,
        waitFor: validatedWaitFor,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: 'Scraping failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scrape successful for:', formattedUrl);
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to scrape' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

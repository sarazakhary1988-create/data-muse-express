import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MapRequest {
  url: string;
  search?: string;
  limit?: number;
}

// Input validation constants
const MAX_URL_LENGTH = 2048;
const MAX_SEARCH_LENGTH = 500;
const MAX_LIMIT = 500;
const MIN_LIMIT = 1;
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
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
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    parsed = new URL(formattedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only HTTP/HTTPS URLs are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname)) {
    return { valid: false, error: 'URL not allowed' };
  }

  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'URL not allowed' };
    }
  }

  return { valid: true };
}

function validateSearch(search: unknown): string | undefined {
  if (typeof search !== 'string') return undefined;
  const trimmed = search.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_SEARCH_LENGTH);
}

function validateLimit(limit: unknown): number {
  if (typeof limit !== 'number' || isNaN(limit)) {
    return 100;
  }
  return Math.max(MIN_LIMIT, Math.min(Math.floor(limit), MAX_LIMIT));
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

    const { url, search, limit } = body as MapRequest;

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      console.error('URL validation failed:', urlValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate other inputs
    const validatedSearch = validateSearch(search);
    const validatedLimit = validateLimit(limit);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('FIRECRAWL_API_KEY not configured - returning fallback indicator');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured', fallback: true, links: [url] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Mapping URL:', formattedUrl, 'search:', validatedSearch);

    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        search: validatedSearch,
        limit: validatedLimit,
        includeSubdomains: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: 'Mapping failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Map successful, found:', data.links?.length || 0, 'URLs');
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error mapping:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to map' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

// Input validation
const MAX_URL_LENGTH = 2048;
const MAX_SEARCH_LENGTH = 500;
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];

function validateUrl(url: string): { valid: boolean; error?: string; formattedUrl?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }
  
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL must be less than ${MAX_URL_LENGTH} characters` };
  }

  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const parsed = new URL(formattedUrl);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return { valid: false, error: 'URL not allowed' };
    }

    return { valid: true, formattedUrl };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
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

    const { url, search, limit = 20 } = body as MapRequest;

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      console.error('URL validation failed:', urlValidation.error);
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedUrl = urlValidation.formattedUrl!;
    const domain = new URL(formattedUrl).hostname.replace('www.', '');
    const searchTerm = search?.trim().slice(0, MAX_SEARCH_LENGTH) || '';

    // Use AI to generate likely URLs for this site
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.log('LOVABLE_API_KEY not configured - returning base URL');
      return new Response(
        JSON.stringify({ success: true, links: [formattedUrl], mapMethod: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI-powered URL mapping for:', domain, 'search:', searchTerm);

    const systemPrompt = `You are an expert at understanding website structures. Given a domain, generate a list of likely URLs that would exist on that site.

For financial sites like Tadawul, Argaam, Reuters, Bloomberg:
- Include news, market data, company listings, IPO sections
- Generate realistic URL patterns for that specific site

For other sites:
- Generate typical page URLs based on the domain type

Return ONLY a JSON array of URL strings, nothing else.`;

    const userPrompt = `Generate ${limit} likely URLs for the website: ${domain}
Base URL: ${formattedUrl}
${searchTerm ? `Focus on pages related to: ${searchTerm}` : ''}

Return a JSON array of full URLs. Example:
["https://domain.com/page1", "https://domain.com/page2"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status);
      return new Response(
        JSON.stringify({ success: true, links: [formattedUrl], mapMethod: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse the JSON array
    let links: string[] = [formattedUrl];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          links = parsed.filter((l): l is string => typeof l === 'string' && l.startsWith('http'));
        }
      }
    } catch (parseError) {
      console.error('Failed to parse URL list:', parseError);
    }

    console.log('AI URL mapping successful, found:', links.length, 'URLs');

    return new Response(
      JSON.stringify({ success: true, links, mapMethod: 'ai-powered' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI mapping:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'URL mapping failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
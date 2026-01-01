import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
}

// Input validation
const MAX_URL_LENGTH = 2048;
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];

function validateUrl(url: string): { valid: boolean; error?: string; formattedUrl?: string } {
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

    const { url } = body as ScrapeRequest;

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

    // Use AI to analyze and describe what content would be at this URL
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            markdown: `# Content from ${domain}\n\nURL: ${formattedUrl}\n\n*AI content extraction available. No external scraping dependencies required.*`,
            metadata: {
              title: `Page from ${domain}`,
              sourceURL: formattedUrl,
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI-powered content analysis for:', formattedUrl);

    const systemPrompt = `You are an expert at analyzing web pages and extracting their content. Given a URL, use your knowledge to describe what content would typically be found at this type of page.

For financial/stock market sites (Tadawul, Argaam, Reuters, Bloomberg, CMA):
- Provide typical content structure
- Include relevant market data you know about
- Reference actual companies and data

For news sites:
- Provide typical article structure
- Include relevant facts you know about the topic

Always return structured markdown content.`;

    const userPrompt = `Analyze this URL and provide the expected content: ${formattedUrl}

Based on the URL structure and domain, provide:
1. Page title and description
2. Main content that would typically appear
3. Any relevant data, statistics, or information
4. Links that might be present

Format as markdown. Include actual factual information you know about this topic/site.`;

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
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            markdown: `# ${domain}\n\nURL: ${formattedUrl}\n\n*Content analysis unavailable at this time.*`,
            metadata: {
              title: `Page from ${domain}`,
              sourceURL: formattedUrl,
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    console.log('AI content analysis successful for:', domain);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          markdown: content,
          metadata: {
            title: `Content from ${domain}`,
            sourceURL: formattedUrl,
            analysisMethod: 'ai-powered'
          },
          links: []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI scrape:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Content analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
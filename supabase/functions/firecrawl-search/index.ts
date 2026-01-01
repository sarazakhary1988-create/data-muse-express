import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { query, options } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('[firecrawl-search] FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[firecrawl-search] Searching:', query);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: options?.limit || 10,
        lang: options?.lang || 'en',
        country: options?.country,
        tbs: options?.tbs, // Time filter: 'qdr:h', 'qdr:d', 'qdr:w', 'qdr:m', 'qdr:y'
        scrapeOptions: options?.scrapeOptions || { formats: ['markdown'] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[firecrawl-search] API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalTime = Date.now() - startTime;
    console.log('[firecrawl-search] Success - found', data.data?.length || 0, 'results in', totalTime, 'ms');

    // Normalize response format
    const results = (data.data || []).map((item: any, index: number) => ({
      id: `firecrawl-${Date.now()}-${index}`,
      url: item.url,
      title: item.title || 'Untitled',
      description: item.description || '',
      markdown: item.markdown || item.description || '',
      content: item.markdown || item.content || item.description || '',
      fetchedAt: new Date().toISOString(),
      sourceStatus: 'success',
      reliability: 0.85 - (index * 0.03),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        totalResults: results.length,
        searchMethod: 'firecrawl',
        timing: { total: totalTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[firecrawl-search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

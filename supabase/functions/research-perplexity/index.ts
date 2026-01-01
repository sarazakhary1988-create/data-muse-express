import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerplexityRequest {
  query: string;
  model?: string;
  searchMode?: 'academic' | 'general';
  searchRecency?: 'day' | 'week' | 'month' | 'year';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      model = 'sonar',
      searchMode,
      searchRecency
    } = await req.json() as PerplexityRequest;

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.log('PERPLEXITY_API_KEY not configured, returning not available');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity not configured', notConfigured: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perplexity search for:', query?.substring(0, 100));

    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: 'You are a research assistant. Provide factual, well-sourced answers with citations.' },
        { role: 'user', content: query }
      ],
    };

    if (searchMode === 'academic') {
      requestBody.search_mode = 'academic';
    }
    if (searchRecency) {
      requestBody.search_recency_filter = searchRecency;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Perplexity error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    const result = {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
      model: data.model,
    };

    console.log('Perplexity search complete, citations:', result.citations?.length || 0);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error with Perplexity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to query Perplexity';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

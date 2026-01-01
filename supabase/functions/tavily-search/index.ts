import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TavilySearchRequest {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  topic?: 'general' | 'news' | 'finance';
  days?: number;
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      console.error('[tavily-search] TAVILY_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tavily API key not configured. Please add your API key in settings.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as TavilySearchRequest;
    
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = body.query.trim().slice(0, 2000);
    const searchDepth = body.searchDepth || 'advanced';
    const topic = body.topic || 'general';
    const maxResults = Math.min(Math.max(body.maxResults || 10, 1), 20);
    const includeAnswer = body.includeAnswer !== false;
    const includeRawContent = body.includeRawContent === true;
    const days = body.days || 30;

    console.log('[tavily-search] Searching:', { 
      query: query.slice(0, 100), 
      searchDepth, 
      topic, 
      maxResults 
    });

    // Build Tavily API request
    const tavilyBody: Record<string, any> = {
      api_key: TAVILY_API_KEY,
      query,
      search_depth: searchDepth,
      topic,
      max_results: maxResults,
      include_answer: includeAnswer,
      include_raw_content: includeRawContent,
      days,
    };

    // Add domain filters if specified
    if (body.includeDomains && body.includeDomains.length > 0) {
      tavilyBody.include_domains = body.includeDomains;
    }
    if (body.excludeDomains && body.excludeDomains.length > 0) {
      tavilyBody.exclude_domains = body.excludeDomains;
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tavilyBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[tavily-search] Tavily API error:', response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Tavily API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Tavily rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Tavily API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tavilyData = await response.json();
    const totalTime = Date.now() - startTime;

    console.log('[tavily-search] Success:', {
      results: tavilyData.results?.length || 0,
      hasAnswer: !!tavilyData.answer,
      time: totalTime
    });

    // Transform results to our standard format
    const results = (tavilyData.results || []).map((r: any) => ({
      url: r.url,
      title: r.title,
      description: r.content?.slice(0, 300) || '',
      markdown: r.raw_content || r.content || '',
      score: r.score,
      publishedDate: r.published_date,
      fetchedAt: new Date().toISOString(),
      sourceStatus: 'success',
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        answer: tavilyData.answer,
        totalResults: results.length,
        searchMethod: 'tavily',
        query,
        timing: {
          total: totalTime,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[tavily-search] Error:', e);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Search failed',
        timing: { total: Date.now() - startTime },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

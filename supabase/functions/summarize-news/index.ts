import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummarizeRequest {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as SummarizeRequest;
    
    if (!body.title || !body.url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI service not configured',
          summary: 'Unable to generate summary. Please visit the article directly.',
          suggestions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[summarize-news] Summarizing:', body.title.slice(0, 60));

    // Try to fetch the actual article content for better summary
    let articleContent = body.snippet || '';
    try {
      const articleResponse = await fetch(body.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      });
      
      if (articleResponse.ok) {
        const html = await articleResponse.text();
        // Extract text content (basic extraction)
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
        
        if (textContent.length > 200) {
          articleContent = textContent;
        }
      }
    } catch (e) {
      console.log('[summarize-news] Could not fetch article, using snippet:', e);
    }

    const systemPrompt = `You are a professional business news analyst specializing in MENA region markets.

Your task is to:
1. Provide a clear, concise summary of the news article (3-5 sentences)
2. Highlight key facts: numbers, companies, people, dates
3. Explain the business significance and potential market impact
4. Suggest 3-5 related research topics users might want to explore

Be factual and avoid speculation. Focus on verifiable information.`;

    const userPrompt = `Summarize this news article:

Title: ${body.title}
Source: ${body.source || 'Unknown'}
Content: ${articleContent || 'No content available'}

Provide:
1. A clear summary (3-5 sentences)
2. Key facts and figures mentioned
3. Business significance
4. 3-5 suggested research topics related to this news

Return as JSON:
{
  "summary": "Clear 3-5 sentence summary...",
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "significance": "Why this matters for business/markets...",
  "suggestions": [
    {"topic": "Research topic 1", "query": "Specific search query"},
    {"topic": "Research topic 2", "query": "Specific search query"}
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('[summarize-news] AI Gateway error:', response.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI service error',
          summary: body.snippet || 'Summary unavailable.',
          suggestions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let parsed: any;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      console.log('[summarize-news] Failed to parse AI response, using raw content');
      parsed = {
        summary: content.slice(0, 500),
        keyFacts: [],
        significance: '',
        suggestions: []
      };
    }

    console.log('[summarize-news] Summary generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        summary: parsed.summary || 'Summary unavailable.',
        keyFacts: parsed.keyFacts || [],
        significance: parsed.significance || '',
        suggestions: parsed.suggestions || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[summarize-news] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Summarization failed',
        summary: 'Unable to generate summary.',
        suggestions: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

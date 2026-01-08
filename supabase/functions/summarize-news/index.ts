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
  publishDate?: string;
}

interface AIModelResponse {
  model: string;
  summary: string;
  keyFacts: string[];
  significance: string;
  predictions: string[];
  confidence: number;
}

// MANUS 1.6 MAX - Multi-Model AI Summary with OpenAI + Claude + Gemini
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

    // Get all available API keys
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!lovableApiKey && !openaiApiKey && !anthropicApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No AI service configured',
          summary: 'Unable to generate summary. Please visit the article directly.',
          suggestions: [],
          predictions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[summarize-news] Multi-model summary for:', body.title.slice(0, 60));
    console.log('[summarize-news] Available models - OpenAI:', !!openaiApiKey, 'Claude:', !!anthropicApiKey, 'Gemini:', !!lovableApiKey);

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

    // Build prompts
    const publishDateStr = body.publishDate 
      ? `Publication Date: ${body.publishDate}` 
      : `Publication Date: ${new Date().toISOString().split('T')[0]}`;

    const systemPrompt = `You are a professional business news analyst specializing in MENA region markets, particularly Saudi Arabia and GCC countries.

ARTICLE METADATA:
${publishDateStr}
Source: ${body.source || 'Unknown'}

Your task is to:
1. Provide a clear, concise summary of the news article (3-5 sentences)
2. Highlight key facts: numbers, companies, people, dates
3. Explain the business significance and potential market impact
4. Provide 2-3 predictions about future implications
5. Suggest 3-5 related research topics users might want to explore

CRITICAL: 
- Be factual and avoid speculation beyond reasonable predictions
- Focus on verifiable information
- Include specific numbers, dates, and names when available
- For predictions, base them on the facts in the article`;

    const userPrompt = `Summarize this news article:

Title: ${body.title}
Source: ${body.source || 'Unknown'}
${publishDateStr}

Content: ${articleContent || 'No content available'}

Provide:
1. A clear summary (3-5 sentences)
2. Key facts and figures mentioned
3. Business significance
4. 2-3 predictions about future implications based on this news
5. 3-5 suggested research topics related to this news

Return as JSON:
{
  "summary": "Clear 3-5 sentence summary...",
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "significance": "Why this matters for business/markets...",
  "predictions": [
    "Prediction 1 based on the news...",
    "Prediction 2 about market impact...",
    "Prediction 3 about future developments..."
  ],
  "suggestions": [
    {"topic": "Research topic 1", "query": "Specific search query"},
    {"topic": "Research topic 2", "query": "Specific search query"}
  ]
}`;

    // Execute AI calls in parallel for all available models
    const aiCalls: Promise<AIModelResponse | null>[] = [];
    
    // OpenAI GPT-5 (if available)
    if (openaiApiKey) {
      aiCalls.push(callOpenAI(openaiApiKey, systemPrompt, userPrompt));
    }
    
    // Anthropic Claude (if available)
    if (anthropicApiKey) {
      aiCalls.push(callAnthropic(anthropicApiKey, systemPrompt, userPrompt));
    }
    
    // Lovable AI / Gemini (if available)
    if (lovableApiKey) {
      aiCalls.push(callLovableAI(lovableApiKey, systemPrompt, userPrompt));
    }

    // Wait for all AI calls to complete
    const aiResponses = await Promise.allSettled(aiCalls);
    
    // Collect successful responses
    const successfulResponses: AIModelResponse[] = [];
    for (const response of aiResponses) {
      if (response.status === 'fulfilled' && response.value) {
        successfulResponses.push(response.value);
      }
    }

    if (successfulResponses.length === 0) {
      console.error('[summarize-news] All AI models failed');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI service error',
          summary: body.snippet || 'Summary unavailable.',
          suggestions: [],
          predictions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge and synthesize responses from all models
    const mergedResult = mergeAIResponses(successfulResponses);
    
    console.log('[summarize-news] Multi-model summary generated from', successfulResponses.length, 'models');

    return new Response(
      JSON.stringify({
        success: true,
        summary: mergedResult.summary,
        keyFacts: mergedResult.keyFacts,
        significance: mergedResult.significance,
        predictions: mergedResult.predictions,
        suggestions: mergedResult.suggestions,
        publishDate: body.publishDate || new Date().toISOString().split('T')[0],
        source: body.source,
        modelsUsed: successfulResponses.map(r => r.model),
        confidence: mergedResult.confidence,
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
        suggestions: [],
        predictions: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Call OpenAI GPT-5
async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<AIModelResponse | null> {
  try {
    console.log('[summarize-news] Calling OpenAI GPT-5...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for speed and cost efficiency
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('[summarize-news] OpenAI error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = parseAIResponse(content);
    
    return {
      model: 'OpenAI GPT-4o-mini',
      summary: parsed.summary,
      keyFacts: parsed.keyFacts,
      significance: parsed.significance,
      predictions: parsed.predictions || [],
      confidence: 0.9,
    };
  } catch (error) {
    console.error('[summarize-news] OpenAI call failed:', error);
    return null;
  }
}

// Call Anthropic Claude
async function callAnthropic(apiKey: string, systemPrompt: string, userPrompt: string): Promise<AIModelResponse | null> {
  try {
    console.log('[summarize-news] Calling Anthropic Claude...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[summarize-news] Anthropic error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const parsed = parseAIResponse(content);
    
    return {
      model: 'Anthropic Claude Sonnet 4',
      summary: parsed.summary,
      keyFacts: parsed.keyFacts,
      significance: parsed.significance,
      predictions: parsed.predictions || [],
      confidence: 0.92,
    };
  } catch (error) {
    console.error('[summarize-news] Anthropic call failed:', error);
    return null;
  }
}

// Call Lovable AI (Gemini)
async function callLovableAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<AIModelResponse | null> {
  try {
    console.log('[summarize-news] Calling Lovable AI (Gemini)...');
    
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
      console.error('[summarize-news] Lovable AI error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = parseAIResponse(content);
    
    return {
      model: 'Google Gemini 2.5 Flash',
      summary: parsed.summary,
      keyFacts: parsed.keyFacts,
      significance: parsed.significance,
      predictions: parsed.predictions || [],
      confidence: 0.88,
    };
  } catch (error) {
    console.error('[summarize-news] Lovable AI call failed:', error);
    return null;
  }
}

// Parse AI response from JSON
function parseAIResponse(content: string): any {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    return JSON.parse(jsonStr);
  } catch {
    console.log('[summarize-news] Failed to parse AI response as JSON');
    return {
      summary: content.slice(0, 500),
      keyFacts: [],
      significance: '',
      predictions: [],
      suggestions: []
    };
  }
}

// Merge responses from multiple AI models
function mergeAIResponses(responses: AIModelResponse[]): any {
  if (responses.length === 0) {
    return {
      summary: 'Summary unavailable.',
      keyFacts: [],
      significance: '',
      predictions: [],
      suggestions: [],
      confidence: 0,
    };
  }

  if (responses.length === 1) {
    const r = responses[0];
    return {
      summary: r.summary,
      keyFacts: r.keyFacts,
      significance: r.significance,
      predictions: r.predictions,
      suggestions: [],
      confidence: r.confidence,
    };
  }

  // Merge multiple responses - use highest confidence for summary
  const sortedByConfidence = [...responses].sort((a, b) => b.confidence - a.confidence);
  const primary = sortedByConfidence[0];
  
  // Combine key facts from all models (deduplicate)
  const allKeyFacts = new Set<string>();
  responses.forEach(r => r.keyFacts.forEach(f => allKeyFacts.add(f)));
  
  // Combine predictions from all models (deduplicate)
  const allPredictions = new Set<string>();
  responses.forEach(r => r.predictions.forEach(p => allPredictions.add(p)));
  
  // Use the longest/most detailed summary
  const bestSummary = responses.reduce((best, r) => 
    r.summary.length > best.length ? r.summary : best, 
    primary.summary
  );
  
  // Use the most detailed significance
  const bestSignificance = responses.reduce((best, r) => 
    (r.significance?.length || 0) > best.length ? r.significance : best, 
    primary.significance || ''
  );

  // Average confidence across models
  const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

  return {
    summary: bestSummary,
    keyFacts: Array.from(allKeyFacts).slice(0, 8),
    significance: bestSignificance,
    predictions: Array.from(allPredictions).slice(0, 5),
    suggestions: [],
    confidence: avgConfidence,
  };
}

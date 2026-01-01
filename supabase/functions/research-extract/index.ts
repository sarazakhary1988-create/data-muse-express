import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  query: string;
  content: string;
  extractType: 'entities' | 'companies' | 'dates' | 'facts' | 'all';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, content, extractType = 'all' } = await req.json() as ExtractRequest;

    if (!content || content.trim().length < 50) {
      console.log('No content provided for extraction');
      return new Response(
        JSON.stringify({ success: true, data: { entities: [], companies: [], dates: [], facts: [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting structured data for query:', query?.substring(0, 100), 'type:', extractType);

    // Use tool calling for structured extraction
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are a precise data extraction assistant. Extract ONLY information that is explicitly stated in the provided content. Do not infer or assume any data.` 
          },
          { 
            role: 'user', 
            content: `Research Query: "${query}"

Content to analyze:
${content.substring(0, 30000)}

Extract all relevant structured data from this content related to the query.` 
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_research_data',
              description: 'Extract structured research data from content',
              parameters: {
                type: 'object',
                properties: {
                  companies: {
                    type: 'array',
                    description: 'Companies mentioned with relevant details',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Company name' },
                        ticker: { type: 'string', description: 'Stock ticker if mentioned' },
                        market: { type: 'string', description: 'Market/exchange (e.g., TASI, NOMU)' },
                        action: { type: 'string', description: 'Action type (IPO, listing, acquisition, etc.)' },
                        date: { type: 'string', description: 'Relevant date if mentioned' },
                        value: { type: 'string', description: 'Monetary value if mentioned' },
                        source_url: { type: 'string', description: 'Source URL if available' }
                      },
                      required: ['name']
                    }
                  },
                  key_dates: {
                    type: 'array',
                    description: 'Important dates mentioned',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', description: 'The date' },
                        event: { type: 'string', description: 'What happened on this date' },
                        entity: { type: 'string', description: 'Related entity' }
                      },
                      required: ['date', 'event']
                    }
                  },
                  key_facts: {
                    type: 'array',
                    description: 'Key factual claims from the content',
                    items: {
                      type: 'object',
                      properties: {
                        fact: { type: 'string', description: 'The factual claim' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence in this fact' },
                        source: { type: 'string', description: 'Where this fact came from' }
                      },
                      required: ['fact']
                    }
                  },
                  numeric_data: {
                    type: 'array',
                    description: 'Numbers and statistics mentioned',
                    items: {
                      type: 'object',
                      properties: {
                        metric: { type: 'string', description: 'What is being measured' },
                        value: { type: 'string', description: 'The numeric value' },
                        unit: { type: 'string', description: 'Unit of measurement' },
                        context: { type: 'string', description: 'Additional context' }
                      },
                      required: ['metric', 'value']
                    }
                  }
                },
                required: ['companies', 'key_dates', 'key_facts', 'numeric_data']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_research_data' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Parse tool call result
    let extractedData = {
      companies: [],
      key_dates: [],
      key_facts: [],
      numeric_data: []
    };
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    console.log('Extraction complete:', {
      companies: extractedData.companies?.length || 0,
      dates: extractedData.key_dates?.length || 0,
      facts: extractedData.key_facts?.length || 0,
      numeric: extractedData.numeric_data?.length || 0
    });

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

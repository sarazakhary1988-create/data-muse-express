import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeCommandRequest {
  command: string;
  url?: string;
  conversationHistory?: { role: string; content: string }[];
}

interface ExtractedIntent {
  action: 'scrape' | 'search' | 'map' | 'extract' | 'analyze';
  url?: string;
  extractionTargets: string[];
  outputFormat: string;
  filters: string[];
  formats: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, url, conversationHistory = [] }: ScrapeCommandRequest = await req.json();

    if (!command?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Command is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ai-scrape-command] Processing command:', command);
    console.log('[ai-scrape-command] URL context:', url);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the system prompt for understanding scraping commands
    const systemPrompt = `You are an AI assistant specialized in web scraping and data extraction. Your job is to:
1. Understand natural language scraping commands
2. Identify URLs, extraction targets, and desired output formats
3. Execute scraping operations and format the results
4. Provide clear, structured responses about what was extracted

When processing commands:
- Extract any URLs mentioned in the command
- Identify what data the user wants (prices, emails, text, images, etc.)
- Determine the desired output format (bullet points, table, JSON, summary, etc.)
- Suggest appropriate scraping settings

Available scraping capabilities:
- markdown: Clean, LLM-ready text content
- html: Processed HTML with scripts removed
- links: All URLs found on the page
- screenshot: Visual capture of the page
- branding: Extract colors, fonts, logos
- summary: AI-generated content summary

Respond in JSON format with the following structure:
{
  "intent": {
    "action": "scrape|search|map|extract|analyze",
    "url": "extracted or provided URL",
    "extractionTargets": ["what to extract: prices, emails, text, etc."],
    "outputFormat": "desired format: bullets, table, json, summary",
    "filters": ["any filters mentioned"],
    "formats": ["markdown", "links", etc.]
  },
  "response": "Human-friendly response explaining what you'll do",
  "scrapeConfig": {
    "formats": ["markdown"],
    "onlyMainContent": true,
    "extractPatterns": {
      "emails": "regex or extraction method",
      "prices": "extraction method",
      "custom": "based on user request"
    }
  },
  "needsUrl": boolean,
  "readyToScrape": boolean
}`;

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { 
        role: 'user', 
        content: url 
          ? `Current URL context: ${url}\n\nUser command: ${command}`
          : command 
      }
    ];

    // Call AI to understand the command
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('[ai-scrape-command] AI error:', errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('[ai-scrape-command] AI response:', aiContent);

    // Parse AI response
    let parsedResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                        aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      parsedResponse = JSON.parse(jsonStr);
    } catch (e) {
      console.log('[ai-scrape-command] Parsing as text response');
      parsedResponse = {
        intent: {
          action: 'scrape',
          url: url || null,
          extractionTargets: [],
          outputFormat: 'markdown',
          filters: [],
          formats: ['markdown']
        },
        response: aiContent,
        scrapeConfig: {
          formats: ['markdown'],
          onlyMainContent: true,
          extractPatterns: {}
        },
        needsUrl: !url,
        readyToScrape: !!url
      };
    }

    // If we have a URL and are ready to scrape, perform the scrape
    let scrapeResult = null;
    const targetUrl = parsedResponse.intent?.url || url;
    
    if (targetUrl && parsedResponse.readyToScrape !== false) {
      console.log('[ai-scrape-command] Executing scrape for:', targetUrl);
      
      try {
        // Call the research-scrape function
        const scrapeResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/research-scrape`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: targetUrl,
              options: parsedResponse.scrapeConfig || { formats: ['markdown'], onlyMainContent: true }
            }),
          }
        );

        if (scrapeResponse.ok) {
          scrapeResult = await scrapeResponse.json();
          console.log('[ai-scrape-command] Scrape successful');
        } else {
          console.error('[ai-scrape-command] Scrape failed:', await scrapeResponse.text());
        }
      } catch (scrapeError) {
        console.error('[ai-scrape-command] Scrape error:', scrapeError);
      }
    }

    // If we have scrape results, process them according to the command
    interface ExtractedContent {
      emails?: string[];
      prices?: string[];
      phones?: string[];
      links?: string[];
    }
    
    let processedContent: ExtractedContent | null = null;
    if (scrapeResult?.content || scrapeResult?.data?.markdown) {
      const rawContent = scrapeResult.content || scrapeResult.data?.markdown || '';
      
      // Apply extraction based on intent
      const targets: string[] = parsedResponse.intent?.extractionTargets || [];
      processedContent = {};
      
      if (targets.some((t: string) => t.toLowerCase().includes('email'))) {
        const emails = rawContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        processedContent.emails = [...new Set(emails)] as string[];
      }
      
      if (targets.some((t: string) => t.toLowerCase().includes('price') || t.toLowerCase().includes('cost'))) {
        const prices = rawContent.match(/[$€£¥][\d,.]+(?:\.\d{2})?|\d+(?:[,.]\d+)?(?:\s*(?:USD|EUR|GBP|dollars?))?/gi) || [];
        processedContent.prices = [...new Set(prices)] as string[];
      }
      
      if (targets.some((t: string) => t.toLowerCase().includes('phone') || t.toLowerCase().includes('number'))) {
        const phones = rawContent.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];
        processedContent.phones = [...new Set(phones)] as string[];
      }
      
      if (targets.some((t: string) => t.toLowerCase().includes('link') || t.toLowerCase().includes('url'))) {
        const links = rawContent.match(/https?:\/\/[^\s<>"{}|\\^\[\]`]+/g) || [];
        processedContent.links = [...new Set(links)] as string[];
      }
    }

    // Generate enhanced response with extracted data
    let enhancedResponse = parsedResponse.response;
    if (scrapeResult && processedContent) {
      enhancedResponse += '\n\n**Extracted Data:**\n';
      
      if (processedContent.emails?.length) {
        enhancedResponse += `\n📧 **Emails Found (${processedContent.emails.length}):**\n${processedContent.emails.map((e: string) => `- ${e}`).join('\n')}`;
      }
      if (processedContent.prices?.length) {
        enhancedResponse += `\n💰 **Prices Found (${processedContent.prices.length}):**\n${processedContent.prices.slice(0, 20).map((p: string) => `- ${p}`).join('\n')}`;
      }
      if (processedContent.phones?.length) {
        enhancedResponse += `\n📞 **Phone Numbers (${processedContent.phones.length}):**\n${processedContent.phones.map((p: string) => `- ${p}`).join('\n')}`;
      }
      if (processedContent.links?.length) {
        enhancedResponse += `\n🔗 **Links Found (${processedContent.links.length}):**\n${processedContent.links.slice(0, 15).map((l: string) => `- ${l}`).join('\n')}`;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        intent: parsedResponse.intent,
        response: enhancedResponse,
        scrapeConfig: parsedResponse.scrapeConfig,
        needsUrl: parsedResponse.needsUrl,
        readyToScrape: parsedResponse.readyToScrape,
        scrapeResult: scrapeResult ? {
          success: true,
          url: targetUrl,
          wordCount: (scrapeResult.content || scrapeResult.data?.markdown || '').split(/\s+/).length,
          hasContent: !!(scrapeResult.content || scrapeResult.data?.markdown),
          metadata: scrapeResult.metadata || scrapeResult.data?.metadata,
        } : null,
        extractedData: processedContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-scrape-command] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

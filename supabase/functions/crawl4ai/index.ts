import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// CRAWL4AI INTEGRATION
// ========================================
// LLM-friendly web crawling and data extraction
// GitHub: https://github.com/unclecode/crawl4ai
// Provides: web scraping, content extraction, markdown conversion, structured output
// Uses: OpenAI/Claude for LLM extraction (not ORKESTRA AI as primary)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Crawl4AIRequest {
  url?: string;
  urls?: string[];
  query?: string;
  extractionStrategy?: 'llm' | 'css' | 'xpath' | 'auto';
  outputFormat?: 'markdown' | 'json' | 'text' | 'structured';
  extractSchema?: Record<string, any>;
  includeLinks?: boolean;
  includeImages?: boolean;
  followLinks?: boolean;
  maxDepth?: number;
  timeout?: number;
  llmProvider?: 'openai' | 'anthropic' | 'groq' | 'auto';
}

interface Crawl4AIResult {
  success: boolean;
  url: string;
  content: CrawledContent;
  links?: ExtractedLink[];
  images?: ExtractedImage[];
  metadata: CrawlMetadata;
  structuredData?: Record<string, any>;
}

interface CrawledContent {
  markdown: string;
  text: string;
  html?: string;
  title: string;
  description?: string;
  author?: string;
  publishDate?: string;
}

interface ExtractedLink {
  url: string;
  text: string;
  type: 'internal' | 'external';
  relevance?: number;
}

interface ExtractedImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

interface CrawlMetadata {
  statusCode: number;
  contentType: string;
  crawlTime: number;
  contentLength: number;
  language?: string;
  llmProvider?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: Crawl4AIRequest = await req.json();
    console.log('[crawl4ai] Request:', request);

    // Handle single URL or multiple URLs
    const urls = request.urls || (request.url ? [request.url] : []);
    
    if (urls.length === 0) {
      return new Response(JSON.stringify({
        error: 'No URL(s) provided',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process URLs (in parallel for multiple)
    const results = await Promise.all(
      urls.map(url => crawlUrl(url, request))
    );

    // Return single result or array
    const response = urls.length === 1 ? results[0] : { results };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crawl4ai] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function crawlUrl(url: string, options: Crawl4AIRequest): Promise<Crawl4AIResult> {
  const startTime = Date.now();
  
  try {
    // Use Playwright browser function for actual crawling
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/functions/v1/playwright-browser`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        action: 'scrape',
        timeout: options.timeout || 30000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Crawl failed: ${response.statusText}`);
    }

    const crawlData = await response.json();
    
    if (!crawlData.success) {
      throw new Error(crawlData.error || 'Crawl failed');
    }
    
    // Extract content in LLM-friendly format
    const content: CrawledContent = {
      markdown: crawlData.markdown || crawlData.content || '',
      text: crawlData.content || stripHtml(crawlData.html || ''),
      html: crawlData.html,
      title: crawlData.title || extractTitle(crawlData.html || ''),
      description: crawlData.metadata?.description || extractDescription(crawlData.html || ''),
      author: crawlData.metadata?.author,
      publishDate: crawlData.metadata?.publishDate,
    };

    // Extract links if requested
    let links: ExtractedLink[] | undefined;
    if (options.includeLinks && crawlData.links) {
      links = crawlData.links.map((link: string) => ({
        url: link,
        text: link,
        type: isSameDomain(url, link) ? 'internal' : 'external',
      }));
    }

    // Extract images if requested
    let images: ExtractedImage[] | undefined;
    if (options.includeImages && crawlData.images) {
      images = crawlData.images.map((img: { url: string; alt: string }) => ({
        url: img.url,
        alt: img.alt,
      }));
    }

    // Apply LLM extraction if schema provided
    let structuredData: Record<string, any> | undefined;
    let llmProvider: string | undefined;
    if (options.extractSchema && options.extractionStrategy === 'llm') {
      const extraction = await extractWithLLM(content.text, options.extractSchema, options.llmProvider);
      structuredData = extraction.data;
      llmProvider = extraction.provider;
    }

    return {
      success: true,
      url,
      content,
      links,
      images,
      metadata: {
        statusCode: crawlData.metadata?.statusCode || 200,
        contentType: crawlData.metadata?.contentType || 'text/html',
        crawlTime: Date.now() - startTime,
        contentLength: content.text.length,
        language: crawlData.metadata?.language,
        llmProvider,
      },
      structuredData,
    };

  } catch (error) {
    console.error('[crawl4ai] Error crawling URL:', url, error);
    return {
      success: false,
      url,
      content: {
        markdown: '',
        text: '',
        title: '',
      },
      metadata: {
        statusCode: 500,
        contentType: '',
        crawlTime: Date.now() - startTime,
        contentLength: 0,
      },
    };
  }
}

// Check if two URLs are on the same domain
function isSameDomain(url1: string, url2: string): boolean {
  try {
    return new URL(url1).hostname === new URL(url2).hostname;
  } catch {
    return false;
  }
}

// Strip HTML tags to get plain text
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract title from content
function extractTitle(content: string): string {
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  
  return '';
}

// Extract description from meta tags
function extractDescription(content: string): string {
  const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) return descMatch[1].trim();
  
  const ogDescMatch = content.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDescMatch) return ogDescMatch[1].trim();
  
  return '';
}

// Extract structured data using LLM Router (prioritizes local inference)
async function extractWithLLM(
  text: string, 
  schema: Record<string, any>,
  preferredProvider?: 'openai' | 'anthropic' | 'groq' | 'auto'
): Promise<{ data: Record<string, any>; provider: string }> {
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const systemPrompt = `Extract data from the provided text according to this schema:
${JSON.stringify(schema, null, 2)}

Return ONLY valid JSON matching the schema. Do not include any explanation or markdown formatting.`;

  try {
    // Use LLM Router which prioritizes local models (DeepSeek/Llama/Qwen)
    const response = await fetch(`${supabaseUrl}/functions/v1/llm-router`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.substring(0, 10000) },
        ],
        task: 'reasoning',
        preferLocal: true,
        maxTokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM Router failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'LLM extraction failed');
    }

    console.log(`[crawl4ai] Extraction using ${data.model} (${data.inferenceType})`);

    return {
      data: JSON.parse(data.content.replace(/```json\n?|\n?```/g, '')),
      provider: data.model,
    };
  } catch (error) {
    console.error('[crawl4ai] LLM extraction error:', error);
    return { data: { error: 'LLM extraction failed' }, provider: 'none' };
  }
}

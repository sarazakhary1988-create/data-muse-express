import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// CRAWL4AI INTEGRATION
// ========================================
// LLM-friendly web crawling and data extraction
// GitHub: https://github.com/unclecode/crawl4ai
// Provides: web scraping, content extraction, markdown conversion, structured output

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
    // Use the existing web-crawl function as the base crawler
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/functions/v1/web-crawl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        extractContent: true,
        outputFormat: 'markdown',
        timeout: options.timeout || 30000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Crawl failed: ${response.statusText}`);
    }

    const crawlData = await response.json();
    
    // Extract content in LLM-friendly format
    const content: CrawledContent = {
      markdown: crawlData.markdown || crawlData.content || '',
      text: crawlData.text || stripHtml(crawlData.content || ''),
      html: crawlData.html,
      title: crawlData.title || extractTitle(crawlData.content || ''),
      description: crawlData.description || extractDescription(crawlData.content || ''),
      author: crawlData.author,
      publishDate: crawlData.publishDate,
    };

    // Extract links if requested
    let links: ExtractedLink[] | undefined;
    if (options.includeLinks) {
      links = extractLinks(crawlData.html || crawlData.content || '', url);
    }

    // Extract images if requested
    let images: ExtractedImage[] | undefined;
    if (options.includeImages) {
      images = extractImages(crawlData.html || crawlData.content || '', url);
    }

    // Apply LLM extraction if schema provided
    let structuredData: Record<string, any> | undefined;
    if (options.extractSchema && options.extractionStrategy === 'llm') {
      structuredData = await extractWithLLM(content.text, options.extractSchema);
    }

    return {
      success: true,
      url,
      content,
      links,
      images,
      metadata: {
        statusCode: 200,
        contentType: 'text/html',
        crawlTime: Date.now() - startTime,
        contentLength: content.text.length,
      },
      structuredData,
    };

  } catch (error) {
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

// Extract all links from content
function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const baseHost = new URL(baseUrl).hostname;
  
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      const text = match[2].trim();
      
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
      
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
      const linkHost = new URL(fullUrl).hostname;
      
      links.push({
        url: fullUrl,
        text: text || fullUrl,
        type: linkHost === baseHost ? 'internal' : 'external',
      });
    } catch {
      // Skip invalid URLs
    }
  }
  
  return links.slice(0, 100); // Limit to 100 links
}

// Extract all images from content
function extractImages(html: string, baseUrl: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']+)["'])?[^>]*>/gi;
  
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    try {
      const src = match[1];
      const alt = match[2] || '';
      
      if (!src || src.startsWith('data:')) continue;
      
      const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      
      images.push({
        url: fullUrl,
        alt,
      });
    } catch {
      // Skip invalid URLs
    }
  }
  
  return images.slice(0, 50); // Limit to 50 images
}

// Extract structured data using LLM
async function extractWithLLM(
  text: string, 
  schema: Record<string, any>
): Promise<Record<string, any>> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    return { error: 'No API key for LLM extraction' };
  }

  try {
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
            content: `Extract data from the provided text according to this schema:
${JSON.stringify(schema, null, 2)}

Return ONLY valid JSON matching the schema.`
          },
          {
            role: 'user',
            content: text.substring(0, 10000) // Limit input
          }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return { error: 'LLM extraction failed' };
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { error: 'LLM extraction error' };
  }
}

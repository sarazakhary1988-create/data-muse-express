# URL Scraper Feature - Complete Implementation Guide

> **Status**: Production-Ready | **Version**: 2.0 | **Last Updated**: 2025

## Overview

The URL Scraper is an intelligent, multi-URL extraction system that combines automated web scraping with AI-powered content analysis. It supports natural language commands, builds a knowledge base for interactive querying, and generates structured data from any webpage.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENT SCRAPER SYSTEM                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     USER INTERFACE                               │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ URL Input   │   │ AI Chat     │   │ Results     │            │   │
│  │  │ (Multi-URL) │   │ Commands    │   │ Display     │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     SCRAPING ENGINES                             │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ Embedded    │   │ Firecrawl   │   │ Playwright  │            │   │
│  │  │ (Default)   │   │ (Optional)  │   │ (Fallback)  │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     PROCESSING                                   │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ AI Prompt   │   │ Knowledge   │   │ Chat        │            │   │
│  │  │ Enhancement │   │ Base Build  │   │ Session     │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── components/
│   ├── UrlScraper.tsx                # Main scraper component
│   ├── EnhancedURLScraper.tsx        # Multi-URL version
├── lib/
│   └── manus-core/
│       └── intelligentScraper.ts     # Core scraper class

supabase/functions/
├── ai-scrape-command/
│   └── index.ts                      # AI command processing
├── research-scrape/
│   └── index.ts                      # Web scraping engine
├── crawl4ai/
│   └── index.ts                      # Crawl4AI integration
├── playwright-browser/
│   └── index.ts                      # Playwright fallback
```

---

## Implementation Steps

### Step 1: AI Scrape Command Edge Function

Create `supabase/functions/ai-scrape-command/index.ts`:

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeCommandRequest {
  command: string;
  url?: string;
  conversationHistory?: { role: string; content: string }[];
  stream?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, url, conversationHistory = [], stream = false }: ScrapeCommandRequest = await req.json();

    if (!command?.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Command is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ai-scrape-command] Processing command:", command);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the system prompt
    const systemPrompt = `You are an AI assistant specialized in web scraping and data extraction. Your job is to:
1. Understand natural language scraping commands
2. Identify URLs, extraction targets, and desired output formats
3. Provide clear responses about what you'll extract

When processing commands:
- Extract any URLs mentioned in the command
- Identify what data the user wants (prices, emails, text, images, etc.)
- Determine the desired output format (bullet points, table, JSON, summary, etc.)
- Suggest appropriate scraping settings

First, acknowledge the user's request and explain what you'll do.
If a URL is provided, describe what you'll extract from it.
If no URL is given, ask for one politely.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10),
      {
        role: "user",
        content: url ? `Current URL context: ${url}\n\nUser command: ${command}` : command,
      },
    ];

    // Streaming mode
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial status
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Processing your command..." })}\n\n`)
            );

            // Call AI with streaming
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages,
                stream: true,
              }),
            });

            if (!aiResponse.ok) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", message: `AI error: ${aiResponse.status}` })}\n\n`)
              );
              controller.close();
              return;
            }

            const reader = aiResponse.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = "";
            let fullContent = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(jsonStr);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullContent += content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content })}\n\n`));
                    }
                  } catch (e) {
                    // Skip malformed JSON
                  }
                }
              }
            }

            // Extract URL from command or use provided
            const urlMatch = command.match(/https?:\/\/[^\s]+/);
            const targetUrl = urlMatch?.[0] || url;

            // Determine extraction targets
            const commandLower = command.toLowerCase();
            const extractionTargets: string[] = [];
            if (commandLower.includes("email")) extractionTargets.push("emails");
            if (commandLower.includes("price") || commandLower.includes("cost")) extractionTargets.push("prices");
            if (commandLower.includes("phone") || commandLower.includes("number")) extractionTargets.push("phones");
            if (commandLower.includes("link") || commandLower.includes("url")) extractionTargets.push("links");
            
            const wantsProfile = commandLower.includes("profile") || commandLower.includes("summary") || 
                                 commandLower.includes("about") || commandLower.includes("who is");

            // If we have a URL, perform the scrape
            if (targetUrl) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Scraping website..." })}\n\n`)
              );

              try {
                const scrapeResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/research-scrape`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: targetUrl,
                    options: { formats: ["markdown"], onlyMainContent: true },
                  }),
                });

                if (scrapeResponse.ok) {
                  const scrapeResult = await scrapeResponse.json();
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Extracting data..." })}\n\n`)
                  );

                  const rawContent = scrapeResult.content || scrapeResult.data?.markdown || "";
                  const metadata = scrapeResult.metadata || {};

                  // Extract specific data types
                  const extractedData: Record<string, any> = {};

                  if (extractionTargets.includes("emails")) {
                    const emails = rawContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
                    extractedData.emails = [...new Set(emails)];
                  }
                  if (extractionTargets.includes("prices")) {
                    const prices = rawContent.match(/[$€£¥][\d,.]+(?:\.\d{2})?/gi) || [];
                    extractedData.prices = [...new Set(prices)];
                  }
                  if (extractionTargets.includes("phones")) {
                    const phones = rawContent.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];
                    extractedData.phones = [...new Set(phones)];
                  }
                  if (extractionTargets.includes("links")) {
                    const links = rawContent.match(/https?:\/\/[^\s<>"{}|\\^\[\]`]+/g) || [];
                    extractedData.links = [...new Set(links)].slice(0, 20);
                  }

                  // Generate AI profile summary if requested
                  if (wantsProfile && rawContent.length > 100) {
                    const profileResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${LOVABLE_API_KEY}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        model: "google/gemini-3-flash-preview",
                        messages: [
                          {
                            role: "system",
                            content: "Generate a professional profile summary from the provided content. Include key facts, background, and notable achievements.",
                          },
                          {
                            role: "user",
                            content: `Generate a profile summary from this content:\n\n${rawContent.slice(0, 5000)}`,
                          },
                        ],
                      }),
                    });

                    if (profileResponse.ok) {
                      const profileData = await profileResponse.json();
                      extractedData.aiProfileSummary = profileData.choices?.[0]?.message?.content;
                    }
                  }

                  // Send completion event
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "scrape_complete",
                        url: targetUrl,
                        wordCount: rawContent.split(/\s+/).length,
                        metadata,
                        extractedData,
                      })}\n\n`
                    )
                  );
                }
              } catch (scrapeError) {
                console.error("[ai-scrape-command] Scrape error:", scrapeError);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Failed to scrape URL" })}\n\n`)
                );
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("[ai-scrape-command] Stream error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming mode
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        response: data.choices[0].message.content,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-scrape-command] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Step 2: Research Scrape Edge Function

Create `supabase/functions/research-scrape/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
  options?: {
    formats?: ('markdown' | 'html' | 'text' | 'links' | 'screenshot')[];
    onlyMainContent?: boolean;
    waitFor?: number;
    extractRules?: Record<string, string>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, options = {} }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[research-scrape] Scraping:', url);

    // Try Firecrawl first if available
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (FIRECRAWL_API_KEY) {
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: options.formats || ['markdown'],
            onlyMainContent: options.onlyMainContent ?? true,
            waitFor: options.waitFor,
          }),
        });

        if (firecrawlResponse.ok) {
          const data = await firecrawlResponse.json();
          return new Response(JSON.stringify({
            success: true,
            content: data.data?.markdown || data.markdown,
            html: data.data?.html || data.html,
            metadata: data.data?.metadata || data.metadata,
            links: data.data?.links || data.links,
            engine: 'firecrawl',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.log('[research-scrape] Firecrawl failed, falling back:', error);
      }
    }

    // Fallback: Use embedded fetch-based scraping
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!fetchResponse.ok) {
      throw new Error(`Fetch failed: ${fetchResponse.status}`);
    }

    const html = await fetchResponse.text();
    
    // Basic HTML to text conversion
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || 'Untitled';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch?.[1] || '';

    // Extract links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi);
    const links = [...linkMatches].map(m => m[1]).slice(0, 50);

    return new Response(JSON.stringify({
      success: true,
      content: textContent.slice(0, 50000),
      metadata: { title, description, url },
      links,
      engine: 'embedded',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[research-scrape] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 3: Intelligent Scraper Class

Create `src/lib/manus-core/intelligentScraper.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface ScraperOptions {
  formats?: ('markdown' | 'html' | 'links' | 'screenshot')[];
  onlyMainContent?: boolean;
  waitFor?: number;
  maxUrls?: number;
}

export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  html?: string;
  links?: string[];
  metadata?: Record<string, any>;
  scrapedAt: string;
}

export interface ScraperResult {
  success: boolean;
  data: ScrapedData[];
  knowledgeBase?: KnowledgeBase;
  chatSession?: ChatSession;
  errors?: string[];
}

interface KnowledgeBase {
  chunks: Array<{
    id: string;
    content: string;
    source: string;
    metadata: Record<string, any>;
    embedding?: number[];
  }>;
  metadata: {
    totalChunks: number;
    avgChunkSize: number;
    sources: string[];
    createdAt: string;
  };
}

interface ChatSession {
  ask: (question: string) => Promise<string>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Enhance a simple scraping prompt with detailed extraction requirements
 */
export async function enhanceScraperPrompt(userPrompt: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('llm-router', {
      body: {
        model: 'gemini-3-flash-preview',
        prompt: `Enhance this web scraping prompt with specific extraction requirements:\n\n"${userPrompt}"\n\nProvide a detailed list of what should be extracted.`,
        temperature: 0.7,
      },
    });

    if (error || !data?.response) {
      // Fallback to pattern-based enhancement
      const enhancements: Record<string, string> = {
        'company info': `Extract comprehensive company information including:
- Company name, industry, and description
- Financial metrics (revenue, employees, valuation, founding date)
- Key executives and leadership team with roles
- Products and services offered
- Contact information (address, phone, email)
- Social media presence`,
        'linkedin profile': `Extract professional profile information:
- Full name and headline
- Current position and company
- Work experience history
- Education
- Skills and endorsements`,
        'financial data': `Extract financial information:
- Revenue and earnings
- Profitability metrics
- Balance sheet items
- Key ratios`,
      };
      
      const lowerPrompt = userPrompt.toLowerCase();
      for (const [key, enhanced] of Object.entries(enhancements)) {
        if (lowerPrompt.includes(key)) {
          return enhanced;
        }
      }
      
      return `${userPrompt}\n\nExtract all relevant information including text content, structured data, links, and metadata.`;
    }

    return data.response;
  } catch (error) {
    console.error('[Prompt Enhancement] Error:', error);
    return `${userPrompt}\n\nExtract all relevant information.`;
  }
}

/**
 * Main Intelligent Scraper class
 */
export class IntelligentScraper {
  private urls: string[] = [];
  private options: ScraperOptions = {};
  private scrapedData: ScrapedData[] = [];
  
  addURL(url: string): void {
    if (!this.urls.includes(url)) {
      this.urls.push(url);
    }
  }
  
  removeURL(url: string): void {
    this.urls = this.urls.filter(u => u !== url);
  }
  
  async execute(params: {
    prompt: string;
    options?: ScraperOptions;
  }): Promise<ScraperResult> {
    const { prompt, options = {} } = params;
    this.options = { ...this.getDefaultOptions(), ...options };
    
    console.log(`[IntelligentScraper] Starting scrape of ${this.urls.length} URLs`);
    
    // Enhance the prompt
    const enhancedPrompt = await enhanceScraperPrompt(prompt);
    console.log('[IntelligentScraper] Enhanced prompt:', enhancedPrompt);
    
    const errors: string[] = [];
    
    // Scrape each URL
    for (const url of this.urls.slice(0, this.options.maxUrls || 10)) {
      try {
        const { data, error } = await supabase.functions.invoke('research-scrape', {
          body: {
            url,
            options: {
              formats: this.options.formats || ['markdown'],
              onlyMainContent: this.options.onlyMainContent ?? true,
              waitFor: this.options.waitFor,
            },
          },
        });
        
        if (error) {
          errors.push(`${url}: ${error.message}`);
          continue;
        }
        
        this.scrapedData.push({
          url,
          title: data.metadata?.title || 'Untitled',
          content: data.content || '',
          html: data.html,
          links: data.links,
          metadata: data.metadata,
          scrapedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        errors.push(`${url}: ${error.message}`);
      }
    }
    
    // Build knowledge base for chat
    const knowledgeBase = await this.buildKnowledgeBase(this.scrapedData);
    
    // Create chat session
    const chatSession = this.createChatSession(knowledgeBase);
    
    return {
      success: this.scrapedData.length > 0,
      data: this.scrapedData,
      knowledgeBase,
      chatSession,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
  
  private getDefaultOptions(): ScraperOptions {
    return {
      formats: ['markdown'],
      onlyMainContent: true,
      maxUrls: 10,
    };
  }
  
  private async buildKnowledgeBase(data: ScrapedData[]): Promise<KnowledgeBase> {
    const chunks = data.map((item, index) => ({
      id: `chunk-${index}`,
      content: item.content,
      source: item.url,
      metadata: { title: item.title },
    }));
    
    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        avgChunkSize: chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length,
        sources: data.map(d => d.url),
        createdAt: new Date().toISOString(),
      },
    };
  }
  
  private createChatSession(kb?: KnowledgeBase): ChatSession {
    const history: ChatMessage[] = [];
    
    return {
      ask: async (question: string) => {
        try {
          const context = kb ? kb.chunks.map(c => c.content).join('\n\n') : '';
          
          const { data, error } = await supabase.functions.invoke('llm-router', {
            body: {
              messages: [
                {
                  role: 'system',
                  content: `You are a helpful assistant answering questions about scraped web content. Use ONLY the provided context to answer. If the answer isn't in the context, say so.`,
                },
                ...history.map(m => ({ role: m.role, content: m.content })),
                {
                  role: 'user',
                  content: `Context:\n${context.slice(0, 10000)}\n\nQuestion: ${question}`,
                },
              ],
              task: 'chat',
            },
          });
          
          if (error) throw error;
          
          const answer = data.content || 'Unable to generate response.';
          
          history.push({ role: 'user', content: question });
          history.push({ role: 'assistant', content: answer });
          
          return answer;
        } catch (error) {
          console.error('[ChatSession] Error:', error);
          return 'Sorry, I encountered an error processing your question.';
        }
      },
    };
  }
}
```

### Step 4: Frontend Component

Create `src/components/UrlScraper.tsx`:

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Link, MessageSquare, Send, Loader2, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function UrlScraper() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('url');
  
  // AI Chat state
  const [aiChatMessages, setAiChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI scraping assistant. Tell me what you want to extract from a website.\n\n**Examples:**\n- \"Scrape this URL and extract all prices\"\n- \"Get the main content as bullet points\"\n- \"Find all contact information on this page\"",
      timestamp: new Date(),
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages]);

  const handleAiChat = async () => {
    if (!aiInput.trim()) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput,
      timestamp: new Date(),
    };

    setAiChatMessages(prev => [...prev, userMessage]);
    const currentInput = aiInput;
    setAiInput('');
    setIsAiProcessing(true);

    // Create placeholder assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: AIChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setAiChatMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-scrape-command`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            command: currentInput,
            url: url || undefined,
            conversationHistory: aiChatMessages.slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            stream: true
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);

              switch (data.type) {
                case 'status':
                  setAiChatMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: `_${data.message}_\n\n${fullContent}` }
                      : msg
                  ));
                  break;

                case 'delta':
                  fullContent += data.content;
                  setAiChatMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: fullContent }
                      : msg
                  ));
                  break;

                case 'scrape_complete':
                  if (data.url && !url) {
                    setUrl(data.url);
                  }
                  setResult({
                    success: true,
                    url: data.url,
                    wordCount: data.wordCount,
                    metadata: data.metadata,
                    extractedData: data.extractedData
                  });
                  fullContent += `\n\n✅ **Scrape Complete**\n- URL: ${data.url}\n- Words: ${data.wordCount}`;
                  if (data.metadata?.title) {
                    fullContent += `\n- Title: ${data.metadata.title}`;
                  }
                  setAiChatMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: fullContent }
                      : msg
                  ));
                  break;

                case 'error':
                  fullContent += `\n\n❌ **Error:** ${data.message}`;
                  setAiChatMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: fullContent }
                      : msg
                  ));
                  break;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setAiChatMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: '❌ Failed to process your request. Please try again.' }
          : msg
      ));
      toast.error('Failed to process command');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const aiCommandExamples = [
    "Extract all email addresses from this page",
    "Get the company overview and key facts",
    "Find all product prices on this page",
    "Summarize the main content as bullet points",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            URL Scraper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="url">
                <Link className="w-4 h-4 mr-2" />
                URL Input
              </TabsTrigger>
              <TabsTrigger value="ai">
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button
                onClick={() => {
                  setAiInput(`Scrape ${url} and extract the main content`);
                  setActiveTab('ai');
                  setTimeout(() => handleAiChat(), 100);
                }}
                disabled={!url.trim()}
              >
                Scrape URL
              </Button>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card className="bg-muted/30 border-0">
                {/* Chat messages */}
                <div className="h-[300px] overflow-y-auto p-4 space-y-4">
                  {aiChatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border'
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                        <span className="text-[10px] opacity-50 mt-1 block">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isAiProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-background border border-border rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick commands */}
                <div className="px-4 py-2 border-t border-border">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {aiCommandExamples.slice(0, 3).map((example, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs whitespace-nowrap shrink-0"
                        onClick={() => setAiInput(example)}
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        {example.slice(0, 30)}...
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Tell me what to scrape and how to format it..."
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiChat();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAiChat}
                      disabled={!aiInput.trim() || isAiProcessing}
                      className="h-auto"
                    >
                      {isAiProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {result?.extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Data</CardTitle>
          </CardHeader>
          <CardContent>
            {result.extractedData.emails?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Emails</h4>
                <div className="flex flex-wrap gap-2">
                  {result.extractedData.emails.map((email: string, i: number) => (
                    <span key={i} className="bg-muted px-2 py-1 rounded text-sm">{email}</span>
                  ))}
                </div>
              </div>
            )}
            {result.extractedData.prices?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Prices</h4>
                <div className="flex flex-wrap gap-2">
                  {result.extractedData.prices.map((price: string, i: number) => (
                    <span key={i} className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-sm">{price}</span>
                  ))}
                </div>
              </div>
            )}
            {result.extractedData.aiProfileSummary && (
              <div>
                <h4 className="font-medium mb-2">AI Summary</h4>
                <p className="text-muted-foreground">{result.extractedData.aiProfileSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Configuration

### Supabase Config

Add to `supabase/config.toml`:

```toml
[functions.ai-scrape-command]
verify_jwt = false

[functions.research-scrape]
verify_jwt = false
```

### Optional Secrets

| Secret | Description |
|--------|-------------|
| `FIRECRAWL_API_KEY` | Enhanced scraping via Firecrawl |

---

## API Reference

### AI Scrape Command (Streaming)

```http
POST /functions/v1/ai-scrape-command
Content-Type: application/json

{
  "command": "Extract all email addresses from this page",
  "url": "https://example.com/contact",
  "stream": true
}
```

### Research Scrape

```http
POST /functions/v1/research-scrape
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "formats": ["markdown"],
    "onlyMainContent": true
  }
}
```

---

## Extraction Patterns

| Command Keyword | Extracted Data |
|-----------------|----------------|
| `email` | Email addresses |
| `price`, `cost` | Currency values |
| `phone`, `number` | Phone numbers |
| `link`, `url` | Hyperlinks |
| `profile`, `summary`, `about` | AI-generated summary |

---

## Testing

```bash
# Test AI command
curl -X POST "${SUPABASE_URL}/functions/v1/ai-scrape-command" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Scrape https://example.com and get the main content",
    "stream": false
  }'
```

---

## Related Documentation

- [Lead Enrichment README](./LEAD_ENRICHMENT_README.md)
- [Search Engine README](./SEARCH_ENGINE_README.md)
- [AI Chat README](./AI_CHAT_README.md)

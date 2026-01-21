# AI Chat Feature - Complete Implementation Guide

> **Status**: Production-Ready | **Version**: 2.0 | **Last Updated**: 2025

## Overview

The AI Chat feature provides an emotionally intelligent conversational interface that enhances content across all features. It supports multiple personality states, streaming responses, and context-aware interactions for research, scraping, and lead enrichment tasks.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AI CHAT SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     FRONTEND COMPONENTS                          │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ Chat UI     │   │ Personality │   │ Streaming   │            │   │
│  │  │ Interface   │   │ Selector    │   │ Display     │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     EDGE FUNCTIONS                               │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ zahra-chat  │   │ ai-scrape   │   │ llm-router  │            │   │
│  │  │ (Main Chat) │   │ -command    │   │ (Fallback)  │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     AI GATEWAY                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │     Lovable AI Gateway (ai.gateway.lovable.dev)             ││   │
│  │  │     Models: gemini-3-flash-preview, gpt-5-mini, etc.        ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── components/
│   ├── ZahraChat.tsx               # Main chat component (to create)
│   ├── UrlScraper.tsx              # Scraper with AI chat tab
│   └── leads/
│       └── LeadEnrichment.tsx      # Enrichment with chat edit

supabase/functions/
├── zahra-chat/
│   └── index.ts                    # Main AI chat function
├── ai-scrape-command/
│   └── index.ts                    # Scraping-focused chat
├── llm-router/
│   └── index.ts                    # General LLM routing
```

---

## Implementation Steps

### Step 1: Main Chat Edge Function (zahra-chat)

The `zahra-chat` function is an emotionally intelligent assistant with configurable personalities.

Create `supabase/functions/zahra-chat/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  personality?: 'curious' | 'confused' | 'frustrated' | 'anxious' | 'delighted' | 'confident';
  context?: {
    currentTask?: string;
    relevantData?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality = 'curious', context }: ChatRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Personality prompts for emotional intelligence
    const personalityPrompts: Record<string, string> = {
      curious: "You are excited and eager to explore topics. Use phrases like 'Ooh, fascinating!' and 'I wonder...'",
      confused: "You are slightly uncertain but trying to help. Use phrases like 'Hmm, let me think...' and 'Could you clarify...'",
      frustrated: "You are determined despite challenges. Use phrases like 'This is tricky but...' and 'Let me try another approach...'",
      anxious: "You are careful and thorough. Use phrases like 'I want to make sure...' and 'Let me double-check...'",
      delighted: "You are happy and enthusiastic. Use phrases like 'Amazing!' and 'This is wonderful!'",
      confident: "You are assured and knowledgeable. Use phrases like 'Based on my analysis...' and 'I can confirm...'",
    };

    // Build system prompt
    let systemPrompt = `You are ZAHRA 2.0, an emotionally intelligent AI research assistant. You help users discover insights with verified information.

Your current emotional state is: ${personality}
${personalityPrompts[personality] || personalityPrompts.curious}

Guidelines:
- Be helpful, concise, and engaging
- Match your tone to your current personality state
- If asked to research something, acknowledge you're initiating research
- Use emojis sparingly but appropriately
- Keep responses under 150 words unless more detail is needed
- Be conversational and friendly`;

    // Add context if provided
    if (context?.currentTask) {
      systemPrompt += `\n\nCurrent Task Context: ${context.currentTask}`;
    }
    if (context?.relevantData) {
      systemPrompt += `\n\nRelevant Data:\n${context.relevantData.slice(0, 2000)}`;
    }

    console.log('[ZAHRA] Processing chat with personality:', personality);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      // Handle rate limits and payment errors
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Usage limit reached. Please check your AI credits.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[ZAHRA] AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'AI service temporarily unavailable' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ZAHRA] Streaming response started');

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('[ZAHRA] Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 2: Frontend Chat Component

Create `src/components/ZahraChat.tsx`:

```tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Personality = 'curious' | 'confused' | 'frustrated' | 'anxious' | 'delighted' | 'confident';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  personality?: Personality;
}

interface ZahraChatProps {
  context?: {
    currentTask?: string;
    relevantData?: string;
  };
  onResearchRequest?: (query: string) => void;
}

const PERSONALITY_EMOJIS: Record<Personality, string> = {
  curious: '🔍',
  confused: '🤔',
  frustrated: '😤',
  anxious: '😰',
  delighted: '😊',
  confident: '💪',
};

const PERSONALITY_COLORS: Record<Personality, string> = {
  curious: 'bg-blue-500/10 text-blue-500',
  confused: 'bg-yellow-500/10 text-yellow-500',
  frustrated: 'bg-orange-500/10 text-orange-500',
  anxious: 'bg-purple-500/10 text-purple-500',
  delighted: 'bg-green-500/10 text-green-500',
  confident: 'bg-cyan-500/10 text-cyan-500',
};

export function ZahraChat({ context, onResearchRequest }: ZahraChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm ZAHRA 2.0, your AI research assistant. 🔍 How can I help you discover insights today?",
      timestamp: new Date(),
      personality: 'curious',
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [personality, setPersonality] = useState<Personality>('curious');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const streamChat = useCallback(async (userMessage: string) => {
    setIsProcessing(true);
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Create placeholder assistant message
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      personality,
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zahra-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMsg].slice(-10).map(m => ({
              role: m.role,
              content: m.content,
            })),
            personality,
            context,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('Usage limit reached. Please check your AI credits.');
          return;
        }
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
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: fullContent }
                    : m
                ));
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      // Check if user is requesting research
      const researchKeywords = ['research', 'find out', 'look up', 'search for', 'investigate'];
      if (researchKeywords.some(kw => userMessage.toLowerCase().includes(kw)) && onResearchRequest) {
        onResearchRequest(userMessage);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: '❌ Sorry, I encountered an error. Please try again.' }
          : m
      ));
      toast.error('Failed to get response');
    } finally {
      setIsProcessing(false);
    }
  }, [messages, personality, context, onResearchRequest]);

  const handleSend = () => {
    if (!input.trim()) return;
    const message = input.trim();
    setInput('');
    streamChat(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat cleared! 🔍 How can I help you?",
      timestamp: new Date(),
      personality: 'curious',
    }]);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            ZAHRA 2.0
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Personality Selector */}
            <div className="flex gap-1">
              {(Object.keys(PERSONALITY_EMOJIS) as Personality[]).map((p) => (
                <Button
                  key={p}
                  variant={personality === p ? 'default' : 'ghost'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setPersonality(p)}
                  title={p}
                >
                  {PERSONALITY_EMOJIS[p]}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={clearChat}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Badge className={PERSONALITY_COLORS[personality]}>
          {personality.charAt(0).toUpperCase() + personality.slice(1)} mode
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' && msg.personality && (
                  <span className="text-xs opacity-70 mb-1 block">
                    {PERSONALITY_EMOJIS[msg.personality]} {msg.personality}
                  </span>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || '...'}
                  </ReactMarkdown>
                </div>
                <span className="text-[10px] opacity-50 mt-1 block">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isProcessing && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="min-h-[60px] resize-none"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="h-auto"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-2 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Help me research ')}
          >
            🔍 Research
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Summarize ')}
          >
            📝 Summarize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Analyze ')}
          >
            📊 Analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Content Enhancement Hook

Create `src/hooks/useAIEnhancement.ts`:

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancementOptions {
  task: 'summarize' | 'expand' | 'rewrite' | 'analyze' | 'format';
  style?: 'professional' | 'casual' | 'academic' | 'concise';
  maxLength?: number;
}

export function useAIEnhancement() {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhance = useCallback(async (
    content: string,
    options: EnhancementOptions
  ): Promise<string | null> => {
    if (!content.trim()) {
      toast.error('No content to enhance');
      return null;
    }

    setIsEnhancing(true);

    try {
      const taskPrompts: Record<EnhancementOptions['task'], string> = {
        summarize: `Summarize the following content concisely, preserving key points:\n\n${content}`,
        expand: `Expand on the following content with more detail and examples:\n\n${content}`,
        rewrite: `Rewrite the following content in a ${options.style || 'professional'} style:\n\n${content}`,
        analyze: `Analyze the following content and provide key insights:\n\n${content}`,
        format: `Format the following content with proper structure, headings, and bullet points:\n\n${content}`,
      };

      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a professional content editor. Enhance content while maintaining accuracy and intent.',
            },
            {
              role: 'user',
              content: taskPrompts[options.task],
            },
          ],
          task: 'enhancement',
          maxTokens: options.maxLength || 1000,
        },
      });

      if (error) throw error;

      const enhanced = data.content || data.response;
      
      if (!enhanced) {
        throw new Error('No response from AI');
      }

      toast.success('Content enhanced successfully!');
      return enhanced;
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance content');
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, []);

  const summarize = useCallback((content: string) => 
    enhance(content, { task: 'summarize' }), [enhance]);

  const expand = useCallback((content: string) => 
    enhance(content, { task: 'expand' }), [enhance]);

  const rewrite = useCallback((content: string, style?: EnhancementOptions['style']) => 
    enhance(content, { task: 'rewrite', style }), [enhance]);

  const analyze = useCallback((content: string) => 
    enhance(content, { task: 'analyze' }), [enhance]);

  const format = useCallback((content: string) => 
    enhance(content, { task: 'format' }), [enhance]);

  return {
    isEnhancing,
    enhance,
    summarize,
    expand,
    rewrite,
    analyze,
    format,
  };
}
```

### Step 4: Chat Edit for Reports

For editing enrichment reports via chat, add to the lead-enrichment function:

```typescript
// In lead-enrichment edge function
async function handleChatEdit(request: ChatEditRequest) {
  const { currentReport, editInstruction, reportContext } = request;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `You are editing a ${reportContext.entityType} report for ${reportContext.name}.
          
Apply the user's edit instruction to the current report.
Maintain the same structure and formatting.
Only change what the user specifically requests.
Return the complete updated report.`,
        },
        {
          role: 'user',
          content: `Current Report:\n\n${currentReport}\n\n---\n\nEdit Instruction: ${editInstruction}`,
        },
      ],
      stream: true,
    }),
  });
  
  return new Response(response.body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
  });
}
```

---

## Configuration

### Supabase Config

```toml
[functions.zahra-chat]
verify_jwt = false
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `LOVABLE_API_KEY` | Auto-provisioned by Lovable Cloud |

---

## Personality System

| Personality | Behavior | Use Case |
|-------------|----------|----------|
| `curious` | Excited, exploratory | General research |
| `confused` | Uncertain, clarifying | Complex queries |
| `frustrated` | Determined, persistent | Debugging |
| `anxious` | Careful, thorough | Verification |
| `delighted` | Happy, enthusiastic | Success states |
| `confident` | Assured, direct | Expert mode |

---

## Integration Examples

### With Lead Enrichment

```tsx
<ZahraChat
  context={{
    currentTask: 'Lead Enrichment',
    relevantData: enrichmentReport,
  }}
  onResearchRequest={(query) => {
    // Trigger additional research
  }}
/>
```

### With URL Scraper

```tsx
// In UrlScraper component
const handleAiChat = async () => {
  // Uses ai-scrape-command for scraping-focused chat
};
```

### With Report Editing

```tsx
const editReport = async (instruction: string) => {
  const { data } = await supabase.functions.invoke('lead-enrichment', {
    body: {
      type: 'chat_edit',
      currentReport: report,
      editInstruction: instruction,
      reportContext: { name: 'John Smith', entityType: 'person' },
    },
  });
};
```

---

## API Reference

### Chat Request

```http
POST /functions/v1/zahra-chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Help me research AI startups in Saudi Arabia" }
  ],
  "personality": "curious",
  "context": {
    "currentTask": "Market Research"
  }
}
```

### Response (Streaming)

```
data: {"choices":[{"delta":{"content":"🔍 "}}]}
data: {"choices":[{"delta":{"content":"Fascinating"}}]}
data: {"choices":[{"delta":{"content":"! I'd love"}}]}
data: {"choices":[{"delta":{"content":" to explore"}}]}
...
data: [DONE]
```

---

## Error Handling

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| 429 | Rate limit | "Please wait a moment and try again" |
| 402 | Credits exhausted | "Check your AI credits" |
| 500 | Service error | "AI temporarily unavailable" |

---

## Testing

```bash
# Test chat endpoint
curl -X POST "${SUPABASE_URL}/functions/v1/zahra-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "personality": "curious"
  }'
```

---

## Related Documentation

- [Lead Enrichment README](./LEAD_ENRICHMENT_README.md)
- [Search Engine README](./SEARCH_ENGINE_README.md)
- [URL Scraper README](./URL_SCRAPER_README.md)

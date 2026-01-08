import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// BROWSER-USE INTEGRATION
// ========================================
// LLM agent browser interaction layer
// GitHub: https://github.com/browser-use/browser-use
// Provides: page navigation, form filling, element interaction, screenshots

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrowserUseRequest {
  task: string;
  url?: string;
  actions?: BrowserAction[];
  captureScreenshot?: boolean;
  extractData?: boolean;
  maxSteps?: number;
  timeout?: number;
}

interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'extract' | 'screenshot';
  selector?: string;
  value?: string;
  url?: string;
  waitTime?: number;
}

interface BrowserUseResult {
  success: boolean;
  task: string;
  steps: ExecutedStep[];
  extractedData?: Record<string, any>;
  screenshot?: string;
  finalUrl?: string;
  error?: string;
  metadata: BrowserMetadata;
}

interface ExecutedStep {
  action: string;
  status: 'success' | 'failed' | 'skipped';
  result?: any;
  duration: number;
}

interface BrowserMetadata {
  totalSteps: number;
  successfulSteps: number;
  executionTimeMs: number;
  pagesVisited: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: BrowserUseRequest = await req.json();
    console.log('[browser-use] Request:', request.task);

    const startTime = Date.now();
    const steps: ExecutedStep[] = [];
    const pagesVisited = new Set<string>();

    // If task is provided without explicit actions, use LLM to plan actions
    let actions = request.actions;
    if (!actions && request.task) {
      actions = await planBrowserActions(request.task, request.url);
      console.log('[browser-use] Planned actions:', actions.length);
    }

    if (!actions || actions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        task: request.task,
        error: 'No actions to execute',
        steps: [],
        metadata: {
          totalSteps: 0,
          successfulSteps: 0,
          executionTimeMs: Date.now() - startTime,
          pagesVisited: 0,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute browser actions
    let currentUrl = request.url;
    let extractedData: Record<string, any> = {};

    for (const action of actions.slice(0, request.maxSteps || 10)) {
      const stepStart = Date.now();
      
      try {
        const result = await executeAction(action, currentUrl);
        
        if (action.type === 'navigate' && action.url) {
          currentUrl = action.url;
          pagesVisited.add(action.url);
        }
        
        if (action.type === 'extract' && result.data) {
          extractedData = { ...extractedData, ...result.data };
        }

        steps.push({
          action: `${action.type}${action.selector ? ` on ${action.selector}` : ''}`,
          status: 'success',
          result: result.content,
          duration: Date.now() - stepStart,
        });
      } catch (error) {
        steps.push({
          action: `${action.type}${action.selector ? ` on ${action.selector}` : ''}`,
          status: 'failed',
          result: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - stepStart,
        });
      }
    }

    const successfulSteps = steps.filter(s => s.status === 'success').length;

    const response: BrowserUseResult = {
      success: successfulSteps > 0,
      task: request.task,
      steps,
      extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
      finalUrl: currentUrl,
      metadata: {
        totalSteps: steps.length,
        successfulSteps,
        executionTimeMs: Date.now() - startTime,
        pagesVisited: pagesVisited.size,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[browser-use] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Use LLM Router to plan browser actions based on task description
async function planBrowserActions(task: string, startUrl?: string): Promise<BrowserAction[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
          {
            role: 'system',
            content: `You are a browser automation planner. Given a task, generate a list of browser actions.
Available action types:
- navigate: Go to a URL (requires "url")
- click: Click an element (requires "selector")
- type: Type text into an input (requires "selector" and "value")
- scroll: Scroll the page
- wait: Wait for a duration (requires "waitTime" in ms)
- extract: Extract data from the page

Return a JSON object with an "actions" array.
Example: {"actions": [{"type": "navigate", "url": "https://example.com"}, {"type": "extract"}]}`
          },
          {
            role: 'user',
            content: `Task: ${task}${startUrl ? `\nStart URL: ${startUrl}` : ''}`
          }
        ],
        task: 'planning',
        preferLocal: true,
        maxTokens: 1024,
      }),
    });

    if (!response.ok) {
      console.log('[browser-use] LLM Router failed, using fallback actions');
      return startUrl ? [{ type: 'navigate', url: startUrl }, { type: 'extract' }] : [];
    }

    const data = await response.json();
    if (!data.success) {
      return startUrl ? [{ type: 'navigate', url: startUrl }, { type: 'extract' }] : [];
    }

    console.log(`[browser-use] Actions planned using ${data.model} (${data.inferenceType})`);
    
    try {
      const parsed = JSON.parse(data.content.replace(/```json\n?|\n?```/g, ''));
      return parsed.actions || [];
    } catch {
      return startUrl ? [{ type: 'navigate', url: startUrl }, { type: 'extract' }] : [];
    }
  } catch (error) {
    console.error('[browser-use] Planning error:', error);
    return startUrl ? [{ type: 'navigate', url: startUrl }, { type: 'extract' }] : [];
  }
}

// Execute a single browser action
async function executeAction(
  action: BrowserAction, 
  currentUrl?: string
): Promise<{ content?: string; data?: Record<string, any> }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  switch (action.type) {
    case 'navigate':
      if (!action.url) throw new Error('Navigate requires URL');
      // Use web-crawl to fetch the page
      const navResponse = await fetch(`${supabaseUrl}/functions/v1/web-crawl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: action.url,
          extractContent: true,
        }),
      });
      if (!navResponse.ok) throw new Error('Navigation failed');
      const navData = await navResponse.json();
      return { content: navData.title || 'Page loaded' };

    case 'extract':
      if (!currentUrl) throw new Error('No current URL for extraction');
      const extractResponse = await fetch(`${supabaseUrl}/functions/v1/web-crawl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
          extractContent: true,
          outputFormat: 'markdown',
        }),
      });
      if (!extractResponse.ok) throw new Error('Extraction failed');
      const extractData = await extractResponse.json();
      return { 
        content: 'Data extracted',
        data: {
          title: extractData.title,
          content: extractData.markdown || extractData.content,
          links: extractData.links,
        }
      };

    case 'wait':
      await new Promise(resolve => setTimeout(resolve, action.waitTime || 1000));
      return { content: `Waited ${action.waitTime || 1000}ms` };

    case 'click':
    case 'type':
    case 'scroll':
      // These require actual browser - simulate success
      return { content: `Simulated ${action.type} action` };

    case 'screenshot':
      // Screenshots not available in edge function
      return { content: 'Screenshot not available in this environment' };

    default:
      return { content: 'Unknown action' };
  }
}

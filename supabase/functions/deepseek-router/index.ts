import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// DEEPSEEK/QWEN/LLAMA MODEL ROUTER
// ========================================
// Routes requests to open-source models: DeepSeek-V3, Qwen 2.5, Llama 3.3
// Provides fallback chain for reliability

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model configurations
const MODEL_CONFIGS = {
  'deepseek-v3': {
    name: 'DeepSeek-V3',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    maxTokens: 8192,
  },
  'qwen-2.5': {
    name: 'Qwen 2.5',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    maxTokens: 8192,
  },
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    apiKeyEnv: 'TOGETHER_API_KEY',
    maxTokens: 4096,
  },
  // Fallback to Lovable AI (always available)
  'lovable-gemini': {
    name: 'Lovable AI (Gemini)',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-flash',
    apiKeyEnv: 'LOVABLE_API_KEY',
    maxTokens: 8192,
  },
} as const;

type ModelId = keyof typeof MODEL_CONFIGS;

interface RouterRequest {
  messages: Array<{ role: string; content: string }>;
  model?: ModelId;
  fallbackChain?: ModelId[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  task?: 'reasoning' | 'coding' | 'planning' | 'general';
}

interface RouterResponse {
  success: boolean;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  fallbacksUsed?: string[];
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: RouterRequest = await req.json();
    console.log('[deepseek-router] Request for model:', request.model || 'auto');

    // Determine model based on task if not specified
    let modelId = request.model || selectModelForTask(request.task);
    
    // Build fallback chain
    const fallbackChain = request.fallbackChain || buildFallbackChain(modelId);
    const usedFallbacks: string[] = [];

    // Try models in order until one succeeds
    for (const tryModelId of [modelId, ...fallbackChain]) {
      const config = MODEL_CONFIGS[tryModelId];
      const apiKey = Deno.env.get(config.apiKeyEnv);

      if (!apiKey) {
        console.log(`[deepseek-router] No API key for ${config.name}, trying fallback...`);
        if (tryModelId !== modelId) usedFallbacks.push(tryModelId);
        continue;
      }

      try {
        const result = await callModel(config, apiKey, request);
        
        if (result.success) {
          const response: RouterResponse = {
            success: true,
            model: config.name,
            content: result.content,
            usage: result.usage,
            fallbacksUsed: usedFallbacks.length > 0 ? usedFallbacks : undefined,
          };

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.log(`[deepseek-router] ${config.name} failed:`, error);
        if (tryModelId !== modelId) usedFallbacks.push(tryModelId);
      }
    }

    // All models failed
    return new Response(JSON.stringify({
      success: false,
      error: 'All models in fallback chain failed',
      model: 'none',
      content: '',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[deepseek-router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Select best model for task type
function selectModelForTask(task?: string): ModelId {
  switch (task) {
    case 'reasoning':
    case 'coding':
      return 'deepseek-v3'; // Best for reasoning and coding
    case 'planning':
      return 'lovable-gemini'; // Good for planning tasks
    default:
      return 'deepseek-v3'; // Default to DeepSeek
  }
}

// Build fallback chain based on primary model
function buildFallbackChain(primary: ModelId): ModelId[] {
  const chain: ModelId[] = [];
  
  // Always end with Lovable AI as ultimate fallback
  const allModels: ModelId[] = ['deepseek-v3', 'qwen-2.5', 'llama-3.3-70b', 'lovable-gemini'];
  
  for (const model of allModels) {
    if (model !== primary && !chain.includes(model)) {
      chain.push(model);
    }
  }
  
  return chain;
}

// Call a specific model
async function callModel(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: RouterRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: request.messages,
      max_tokens: Math.min(request.maxTokens || 2048, config.maxTokens),
      temperature: request.temperature ?? 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.name} API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return {
    success: true,
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

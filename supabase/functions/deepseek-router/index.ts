import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// MANUS 1.7 MAX - LOCAL INFERENCE ROUTER
// ========================================
// DeepSeek: via Ollama or vLLM (local server)
// Llama 3.3 70B: via HuggingFace local / vLLM
// Qwen 2.5: via HuggingFace local / vLLM
// Fallback: ORKESTRA AI

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Local inference endpoints - configure via environment variables
const LOCAL_ENDPOINTS = {
  // Ollama default endpoint for DeepSeek
  OLLAMA_URL: Deno.env.get('OLLAMA_URL') || 'http://localhost:11434',
  // vLLM endpoint if using vLLM instead
  VLLM_URL: Deno.env.get('VLLM_URL') || 'http://localhost:8000',
  // HuggingFace TGI endpoint for Llama/Qwen
  HF_TGI_URL: Deno.env.get('HF_TGI_URL') || 'http://localhost:8080',
};

// Model configurations for local inference
const MODEL_CONFIGS = {
  // DeepSeek via Ollama (local)
  'deepseek-v3': {
    name: 'DeepSeek-V3 (Local Ollama)',
    provider: 'ollama',
    endpoint: `${LOCAL_ENDPOINTS.OLLAMA_URL}/api/chat`,
    model: 'deepseek-coder-v2:latest', // or deepseek-v3 when available
    maxTokens: 8192,
    isOllama: true,
  },
  // DeepSeek via vLLM (local - alternative)
  'deepseek-vllm': {
    name: 'DeepSeek-V3 (Local vLLM)',
    provider: 'vllm',
    endpoint: `${LOCAL_ENDPOINTS.VLLM_URL}/v1/chat/completions`,
    model: 'deepseek-ai/DeepSeek-V3',
    maxTokens: 8192,
    isOllama: false,
  },
  // Llama 3.3 70B via HuggingFace TGI (local)
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B (Local HF)',
    provider: 'huggingface-tgi',
    endpoint: `${LOCAL_ENDPOINTS.HF_TGI_URL}/v1/chat/completions`,
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    maxTokens: 4096,
    isOllama: false,
  },
  // Llama via Ollama (alternative)
  'llama-ollama': {
    name: 'Llama 3.3 (Local Ollama)',
    provider: 'ollama',
    endpoint: `${LOCAL_ENDPOINTS.OLLAMA_URL}/api/chat`,
    model: 'llama3.3:70b',
    maxTokens: 4096,
    isOllama: true,
  },
  // Qwen 2.5 via HuggingFace TGI (local)
  'qwen-2.5': {
    name: 'Qwen 2.5 72B (Local HF)',
    provider: 'huggingface-tgi',
    endpoint: `${LOCAL_ENDPOINTS.HF_TGI_URL}/v1/chat/completions`,
    model: 'Qwen/Qwen2.5-72B-Instruct',
    maxTokens: 8192,
    isOllama: false,
  },
  // Qwen via Ollama (alternative)
  'qwen-ollama': {
    name: 'Qwen 2.5 (Local Ollama)',
    provider: 'ollama',
    endpoint: `${LOCAL_ENDPOINTS.OLLAMA_URL}/api/chat`,
    model: 'qwen2.5:72b',
    maxTokens: 8192,
    isOllama: true,
  },
  // ORKESTRA AI as ultimate fallback (always available)
  'orkestra-gemini': {
    name: 'ORKESTRA AI (Gemini)',
    provider: 'orkestra',
    endpoint: 'https://ai.gateway.orkestra.dev/v1/chat/completions',
    model: 'google/gemini-2.5-flash',
    apiKeyEnv: 'ORKESTRA_API_KEY',
    maxTokens: 8192,
    isOllama: false,
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
  provider: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  fallbacksUsed?: string[];
  error?: string;
  inferenceType: 'local' | 'cloud';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: RouterRequest = await req.json();
    console.log('[Local LLM Router] Request for model:', request.model || 'auto');
    console.log('[Local LLM Router] Endpoints:', LOCAL_ENDPOINTS);

    // Determine model based on task if not specified
    let modelId = request.model || selectModelForTask(request.task);
    
    // Build fallback chain prioritizing local models
    const fallbackChain = request.fallbackChain || buildFallbackChain(modelId);
    const usedFallbacks: string[] = [];

    // Try models in order until one succeeds
    for (const tryModelId of [modelId, ...fallbackChain]) {
      const config = MODEL_CONFIGS[tryModelId];
      if (!config) continue;

      try {
        console.log(`[Local LLM Router] Trying ${config.name}...`);
        
        // Check if it's a cloud model (ORKESTRA) and needs API key
        if ((config as any).apiKeyEnv) {
          const apiKey = Deno.env.get((config as any).apiKeyEnv);
          if (!apiKey) {
            console.log(`[Local LLM Router] No API key for ${config.name}, trying fallback...`);
            usedFallbacks.push(tryModelId);
            continue;
          }
        }

        const result = config.isOllama 
          ? await callOllama(config, request)
          : await callOpenAICompatible(config, request);
        
        if (result.success) {
          const response: RouterResponse = {
            success: true,
            model: config.name,
            provider: config.provider,
            content: result.content,
            usage: result.usage,
            fallbacksUsed: usedFallbacks.length > 0 ? usedFallbacks : undefined,
            inferenceType: config.provider === 'orkestra' ? 'cloud' : 'local',
          };

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.log(`[Local LLM Router] ${config.name} failed:`, error);
        usedFallbacks.push(tryModelId);
      }
    }

    // All models failed
    return new Response(JSON.stringify({
      success: false,
      error: 'All models in fallback chain failed. Ensure Ollama/vLLM/HuggingFace TGI is running locally.',
      model: 'none',
      provider: 'none',
      content: '',
      inferenceType: 'none',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Local LLM Router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Select best model for task type - prioritize local models
function selectModelForTask(task?: string): ModelId {
  switch (task) {
    case 'reasoning':
    case 'coding':
      return 'deepseek-v3'; // DeepSeek best for reasoning/coding
    case 'planning':
      return 'llama-3.3-70b'; // Llama good for planning
    default:
      return 'deepseek-v3'; // Default to DeepSeek
  }
}

// Build fallback chain - local models first, ORKESTRA AI as last resort
function buildFallbackChain(primary: ModelId): ModelId[] {
  const chain: ModelId[] = [];
  
  // Prioritize local models, end with ORKESTRA AI as ultimate fallback
  const allModels: ModelId[] = [
    'deepseek-v3',
    'deepseek-vllm',
    'llama-3.3-70b',
    'llama-ollama',
    'qwen-2.5',
    'qwen-ollama',
    'orkestra-gemini', // Ultimate fallback
  ];
  
  for (const model of allModels) {
    if (model !== primary && !chain.includes(model)) {
      chain.push(model);
    }
  }
  
  return chain;
}

// Call Ollama API
async function callOllama(
  config: typeof MODEL_CONFIGS[ModelId],
  request: RouterRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: request.messages,
      stream: false,
      options: {
        num_predict: Math.min(request.maxTokens || 2048, config.maxTokens),
        temperature: request.temperature ?? 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return {
    success: true,
    content: data.message?.content || '',
    usage: data.prompt_eval_count && data.eval_count ? {
      promptTokens: data.prompt_eval_count,
      completionTokens: data.eval_count,
      totalTokens: data.prompt_eval_count + data.eval_count,
    } : undefined,
  };
}

// Call OpenAI-compatible API (vLLM, HuggingFace TGI, ORKESTRA AI)
async function callOpenAICompatible(
  config: typeof MODEL_CONFIGS[ModelId],
  request: RouterRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key for ORKESTRA AI
  if ((config as any).apiKeyEnv) {
    const apiKey = Deno.env.get((config as any).apiKeyEnv);
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
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
    throw new Error(`${config.provider} API error: ${response.status} - ${errorText}`);
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

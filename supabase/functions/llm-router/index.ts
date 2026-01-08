import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// MANUS 1.7 MAX - UNIFIED LLM ROUTER
// ========================================
// LOCAL INFERENCE: DeepSeek (Ollama/vLLM), Llama (HF TGI), Qwen (HF TGI)
// COMMERCIAL: OpenAI, Claude (when API keys available)
// FALLBACK: Lovable AI (Gemini - always available)
// Orchestration: LangGraph, CrewAI, Mastra patterns

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Local inference endpoints - configure via environment variables
const OLLAMA_URL = Deno.env.get('OLLAMA_URL') || 'http://localhost:11434';
const VLLM_URL = Deno.env.get('VLLM_URL') || 'http://localhost:8000';
const HF_TGI_URL = Deno.env.get('HF_TGI_URL') || 'http://localhost:8080';

// ============ MODEL CONFIGURATIONS ============

const MODEL_CONFIGS = {
  // === LOCAL INFERENCE MODELS (Ollama/vLLM/HuggingFace TGI) ===
  
  // DeepSeek via Ollama (local)
  'deepseek-v3': {
    name: 'DeepSeek-V3 (Local Ollama)',
    provider: 'ollama' as const,
    endpoint: `${OLLAMA_URL}/api/chat`,
    model: 'deepseek-coder-v2:latest',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'planning', 'tool_use'],
    tier: 'local' as const,
    isOllama: true,
    isAnthropic: false,
  },
  
  // DeepSeek via vLLM (local - alternative)
  'deepseek-vllm': {
    name: 'DeepSeek-V3 (Local vLLM)',
    provider: 'vllm' as const,
    endpoint: `${VLLM_URL}/v1/chat/completions`,
    model: 'deepseek-ai/DeepSeek-V3',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'planning', 'tool_use'],
    tier: 'local' as const,
    isOllama: false,
    isAnthropic: false,
  },
  
  // Llama 3.3 70B via HuggingFace TGI (local)
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B (Local HF TGI)',
    provider: 'huggingface-tgi' as const,
    endpoint: `${HF_TGI_URL}/v1/chat/completions`,
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'local' as const,
    isOllama: false,
    isAnthropic: false,
  },
  
  // Llama via Ollama (local - alternative)
  'llama-3.3-70b-ollama': {
    name: 'Llama 3.3 70B (Local Ollama)',
    provider: 'ollama' as const,
    endpoint: `${OLLAMA_URL}/api/chat`,
    model: 'llama3.3:70b',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'local' as const,
    isOllama: true,
    isAnthropic: false,
  },
  
  // Qwen 2.5 via HuggingFace TGI (local)
  'qwen-2.5': {
    name: 'Qwen 2.5 72B (Local HF TGI)',
    provider: 'huggingface-tgi' as const,
    endpoint: `${HF_TGI_URL}/v1/chat/completions`,
    model: 'Qwen/Qwen2.5-72B-Instruct',
    maxTokens: 8192,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'local' as const,
    isOllama: false,
    isAnthropic: false,
  },
  
  // Qwen via Ollama (local - alternative)
  'qwen-2.5-ollama': {
    name: 'Qwen 2.5 (Local Ollama)',
    provider: 'ollama' as const,
    endpoint: `${OLLAMA_URL}/api/chat`,
    model: 'qwen2.5:72b',
    maxTokens: 8192,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'local' as const,
    isOllama: true,
    isAnthropic: false,
  },

  // === COMMERCIAL MODELS (When API keys are available) ===
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai' as const,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'multimodal', 'tool_use'],
    tier: 'commercial' as const,
    isOllama: false,
    isAnthropic: false,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai' as const,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'general'],
    tier: 'commercial' as const,
    isOllama: false,
    isAnthropic: false,
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'openai' as const,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'planning'],
    tier: 'commercial' as const,
    isOllama: false,
    isAnthropic: false,
  },
  
  // Claude (when API key is available)
  'claude-sonnet': {
    name: 'Claude Sonnet 4',
    provider: 'anthropic' as const,
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'planning', 'synthesis'],
    tier: 'commercial' as const,
    isOllama: false,
    isAnthropic: true,
  },

  // === LOVABLE AI (Ultimate fallback - always available) ===
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'lovable' as const,
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-flash',
    apiKeyEnv: 'LOVABLE_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'multimodal', 'synthesis'],
    tier: 'fallback' as const,
    isOllama: false,
    isAnthropic: false,
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    provider: 'lovable' as const,
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-pro',
    apiKeyEnv: 'LOVABLE_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'multimodal', 'complex_analysis'],
    tier: 'fallback' as const,
    isOllama: false,
    isAnthropic: false,
  },
};

type ModelId = keyof typeof MODEL_CONFIGS;
type ModelConfig = typeof MODEL_CONFIGS[ModelId];

// ============ ORCHESTRATION PATTERNS ============

interface LangGraphState {
  messages: any[];
  currentNode: string;
  context: Record<string, any>;
  history: string[];
}

interface CrewAgent {
  role: string;
  goal: string;
  backstory: string;
  model: ModelId;
}

interface MastraConfig {
  enableMetrics: boolean;
  retryPolicy: { maxRetries: number; backoffMs: number };
  timeout: number;
}

// ============ REQUEST/RESPONSE TYPES ============

interface LLMRequest {
  messages: Array<{ role: string; content: string }>;
  model?: ModelId | 'auto';
  task?: 'reasoning' | 'coding' | 'planning' | 'synthesis' | 'research' | 'general';
  fallbackChain?: ModelId[];
  orchestration?: 'langgraph' | 'crewai' | 'mastra' | 'simple';
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  preferLocal?: boolean;
  agents?: CrewAgent[];
  mastraConfig?: MastraConfig;
}

interface LLMResponse {
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
  orchestration?: string;
  inferenceType: 'local' | 'commercial' | 'fallback';
  error?: string;
  executionTimeMs: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: LLMRequest = await req.json();
    console.log('[LLM Router] Request:', {
      model: request.model || 'auto',
      task: request.task,
      orchestration: request.orchestration || 'simple',
      preferLocal: request.preferLocal ?? true,
    });
    console.log('[LLM Router] Local endpoints:', { OLLAMA_URL, VLLM_URL, HF_TGI_URL });

    // Select model based on task if not specified - prioritize local
    let modelId: ModelId = (request.model === 'auto' || !request.model)
      ? selectModelForTask(request.task, request.preferLocal ?? true)
      : request.model as ModelId;

    // Build fallback chain prioritizing local models
    const fallbackChain = request.fallbackChain || buildFallbackChain(modelId, request.preferLocal ?? true);
    const usedFallbacks: string[] = [];

    // Try models in order until one succeeds
    for (const tryModelId of [modelId, ...fallbackChain]) {
      const config = MODEL_CONFIGS[tryModelId];
      if (!config) continue;

      try {
        console.log(`[LLM Router] Trying ${config.name}...`);
        
        // Check if it needs an API key
        const apiKeyEnv = (config as any).apiKeyEnv;
        let apiKey = '';
        
        if (apiKeyEnv) {
          apiKey = Deno.env.get(apiKeyEnv) || '';
          if (!apiKey) {
            console.log(`[LLM Router] No API key for ${config.name}, trying fallback...`);
            usedFallbacks.push(tryModelId);
            continue;
          }
        }

        let result;

        // Use orchestration pattern
        switch (request.orchestration) {
          case 'langgraph':
            result = await executeLangGraph(config, apiKey, request);
            break;
          case 'crewai':
            result = await executeCrewAI(config, apiKey, request);
            break;
          case 'mastra':
            result = await executeMastra(config, apiKey, request);
            break;
          default:
            result = await callModel(config, apiKey, request);
        }

        if (result.success) {
          const response: LLMResponse = {
            success: true,
            model: config.name,
            provider: config.provider,
            content: result.content,
            usage: result.usage,
            fallbacksUsed: usedFallbacks.length > 0 ? usedFallbacks : undefined,
            orchestration: request.orchestration || 'simple',
            inferenceType: config.tier === 'local' ? 'local' : config.tier === 'fallback' ? 'fallback' : 'commercial',
            executionTimeMs: Date.now() - startTime,
          };

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.log(`[LLM Router] ${config.name} failed:`, error);
        usedFallbacks.push(tryModelId);
      }
    }

    // All models failed
    return new Response(JSON.stringify({
      success: false,
      error: 'All models in fallback chain failed. Ensure local inference (Ollama/vLLM/HF TGI) is running or API keys are configured.',
      model: 'none',
      provider: 'none',
      content: '',
      inferenceType: 'none',
      executionTimeMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LLM Router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============ MODEL SELECTION ============

function selectModelForTask(task?: string, preferLocal?: boolean): ModelId {
  const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
  const hasClaude = !!Deno.env.get('ANTHROPIC_API_KEY');

  // Always prioritize local models first (user's preference)
  if (preferLocal) {
    switch (task) {
      case 'reasoning':
      case 'coding':
        return 'deepseek-v3'; // DeepSeek best for reasoning/coding
      case 'planning':
        return 'llama-3.3-70b'; // Llama good for planning
      case 'synthesis':
      case 'research':
        return 'qwen-2.5'; // Qwen for synthesis
      default:
        return 'deepseek-v3';
    }
  }

  // Commercial models if local not preferred
  switch (task) {
    case 'reasoning':
      if (hasOpenAI) return 'gpt-4o';
      return 'deepseek-v3';
    case 'coding':
      return 'deepseek-v3'; // DeepSeek best for coding regardless
    case 'planning':
      if (hasClaude) return 'claude-sonnet';
      if (hasOpenAI) return 'gpt-4o';
      return 'llama-3.3-70b';
    case 'synthesis':
      if (hasOpenAI) return 'gpt-4o';
      if (hasClaude) return 'claude-sonnet';
      return 'qwen-2.5';
    case 'research':
      if (hasOpenAI) return 'gpt-4o';
      return 'llama-3.3-70b';
    default:
      if (hasOpenAI) return 'gpt-4o-mini';
      return 'deepseek-v3';
  }
}

function buildFallbackChain(primary: ModelId, preferLocal?: boolean): ModelId[] {
  const chain: ModelId[] = [];

  // Priority: Local models first, then commercial, then Lovable AI fallback
  const priorityOrder: ModelId[] = preferLocal
    ? [
        // Local models first
        'deepseek-v3',
        'deepseek-vllm',
        'llama-3.3-70b',
        'llama-3.3-70b-ollama',
        'qwen-2.5',
        'qwen-2.5-ollama',
        // Commercial if available
        'gpt-4o',
        'gpt-4o-mini',
        'claude-sonnet',
        // Ultimate fallback
        'gemini-2.5-pro',
        'gemini-2.5-flash',
      ]
    : [
        // Commercial first
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'claude-sonnet',
        // Then local
        'deepseek-v3',
        'llama-3.3-70b',
        'qwen-2.5',
        // Ultimate fallback
        'gemini-2.5-pro',
        'gemini-2.5-flash',
      ];

  for (const model of priorityOrder) {
    if (model !== primary && !chain.includes(model)) {
      chain.push(model);
    }
  }

  return chain;
}

// ============ MODEL CALLING ============

async function callModel(
  config: ModelConfig,
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  // Handle Ollama API
  if (config.isOllama) {
    return callOllama(config, request);
  }

  // Handle Anthropic's different API format
  if (config.isAnthropic) {
    return callAnthropic(config, apiKey, request);
  }

  // Standard OpenAI-compatible API (vLLM, HF TGI, OpenAI, Lovable)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
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
      tools: request.tools,
      tool_choice: request.tool_choice,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.name} API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Handle tool calls
  if (data.choices?.[0]?.message?.tool_calls) {
    return {
      success: true,
      content: JSON.stringify(data.choices[0].message.tool_calls),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

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

// Call Ollama API
async function callOllama(
  config: ModelConfig,
  request: LLMRequest
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

async function callAnthropic(
  config: ModelConfig,
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  const systemMessage = request.messages.find(m => m.role === 'system');
  const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: Math.min(request.maxTokens || 2048, config.maxTokens),
      system: systemMessage?.content || 'You are a helpful AI assistant.',
      messages: nonSystemMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    success: true,
    content: data.content?.[0]?.text || '',
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined,
  };
}

// ============ ORCHESTRATION PATTERNS ============

async function executeLangGraph(
  config: ModelConfig,
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  console.log('[LangGraph] Executing graph-based workflow');

  const state: LangGraphState = {
    messages: request.messages,
    currentNode: 'start',
    context: {},
    history: [],
  };

  const nodes = ['analyze', 'plan', 'execute', 'observe', 'synthesize'];
  let finalContent = '';
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  for (const node of nodes) {
    state.currentNode = node;
    state.history.push(node);

    const nodePrompt = {
      role: 'system',
      content: `You are in the ${node.toUpperCase()} phase of a research workflow. ${getNodeInstruction(node)}`,
    };

    const result = await callModel(config, apiKey, {
      ...request,
      messages: [nodePrompt, ...state.messages],
    });

    if (!result.success) continue;

    state.context[node] = result.content;
    finalContent = result.content;

    if (result.usage) {
      totalUsage.promptTokens += result.usage.promptTokens || 0;
      totalUsage.completionTokens += result.usage.completionTokens || 0;
      totalUsage.totalTokens += result.usage.totalTokens || 0;
    }

    state.messages.push({ role: 'assistant', content: result.content });
  }

  return { success: true, content: finalContent, usage: totalUsage };
}

function getNodeInstruction(node: string): string {
  switch (node) {
    case 'analyze':
      return 'Analyze the user request. Identify key entities, requirements, and constraints.';
    case 'plan':
      return 'Create a step-by-step plan to address the request. List specific actions needed.';
    case 'execute':
      return 'Execute the plan. Gather information and perform the required actions.';
    case 'observe':
      return 'Observe the results. Check for errors, inconsistencies, or missing information.';
    case 'synthesize':
      return 'Synthesize all findings into a comprehensive, well-structured response.';
    default:
      return 'Process the current step in the workflow.';
  }
}

async function executeCrewAI(
  config: ModelConfig,
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  console.log('[CrewAI] Executing role-based multi-agent workflow');

  const defaultAgents: CrewAgent[] = request.agents || [
    {
      role: 'Researcher',
      goal: 'Gather comprehensive information from multiple sources',
      backstory: 'Expert researcher with experience in data collection and verification',
      model: 'deepseek-v3' as ModelId,
    },
    {
      role: 'Analyst',
      goal: 'Analyze data and identify patterns, insights, and contradictions',
      backstory: 'Senior analyst skilled in critical thinking and data interpretation',
      model: 'llama-3.3-70b' as ModelId,
    },
    {
      role: 'Writer',
      goal: 'Produce clear, accurate, and well-structured reports',
      backstory: 'Professional technical writer with expertise in research communication',
      model: 'qwen-2.5' as ModelId,
    },
  ];

  let context = '';
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  for (const agent of defaultAgents) {
    const agentPrompt = {
      role: 'system',
      content: `You are a ${agent.role}. 
Goal: ${agent.goal}
Background: ${agent.backstory}

Previous agent context:
${context || 'You are the first agent in the workflow.'}

Complete your task based on the user's request.`,
    };

    const result = await callModel(config, apiKey, {
      ...request,
      messages: [agentPrompt, ...request.messages],
    });

    if (result.success) {
      context += `\n\n[${agent.role}]:\n${result.content}`;
      
      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens || 0;
        totalUsage.completionTokens += result.usage.completionTokens || 0;
        totalUsage.totalTokens += result.usage.totalTokens || 0;
      }
    }
  }

  return { 
    success: true, 
    content: context, 
    usage: totalUsage 
  };
}

async function executeMastra(
  config: ModelConfig,
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  console.log('[Mastra] Executing production workflow with monitoring');

  const mastraConfig: MastraConfig = request.mastraConfig || {
    enableMetrics: true,
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    timeout: 30000,
  };

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < mastraConfig.retryPolicy.maxRetries) {
    attempt++;
    console.log(`[Mastra] Attempt ${attempt}/${mastraConfig.retryPolicy.maxRetries}`);

    try {
      const result = await callModel(config, apiKey, request);

      if (result.success) {
        console.log(`[Mastra] Success on attempt ${attempt}`);
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[Mastra] Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < mastraConfig.retryPolicy.maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, mastraConfig.retryPolicy.backoffMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  throw lastError || new Error('Mastra workflow failed after all retries');
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// MANUS 1.7 MAX - UNIFIED LLM ROUTER
// ========================================
// PRIMARY: OpenAI, DeepSeek, Llama 3.3 70B, Qwen 2.5
// SECONDARY: Claude, Gemini
// FREE INFERENCE: HuggingFace, Groq (free tier), Cloudflare Workers AI
// Orchestration framework patterns: LangGraph, CrewAI, Mastra

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ MODEL CONFIGURATIONS ============

const MODEL_CONFIGS = {
  // === OPENAI (PRIMARY - User has API key) ===
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'multimodal', 'tool_use'],
    tier: 'primary',
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'general'],
    tier: 'primary',
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'planning'],
    tier: 'primary',
  },

  // === OPEN SOURCE MODELS (FREE INFERENCE) ===
  
  // DeepSeek via their API (has free tier)
  'deepseek-v3': {
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'planning', 'tool_use'],
    tier: 'open-source',
  },
  
  // Llama 3.3 70B via Groq (FREE tier - 30 RPM)
  'llama-3.3-70b-groq': {
    name: 'Llama 3.3 70B (Groq Free)',
    provider: 'groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'open-source-free',
  },
  
  // Llama 3.3 70B via Together.xyz
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B Instruct',
    provider: 'together',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    apiKeyEnv: 'TOGETHER_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'open-source',
  },
  
  // Llama via HuggingFace Inference API (FREE)
  'llama-3.1-70b-hf': {
    name: 'Llama 3.1 70B (HuggingFace Free)',
    provider: 'huggingface',
    endpoint: 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-70B-Instruct',
    model: 'meta-llama/Llama-3.1-70B-Instruct',
    apiKeyEnv: 'HUGGINGFACE_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'open-source-free',
  },

  // Qwen 2.5 via Cloudflare Workers AI (FREE)
  'qwen-2.5-cf': {
    name: 'Qwen 2.5 (Cloudflare Free)',
    provider: 'cloudflare',
    endpoint: 'https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/qwen/qwen1.5-14b-chat-awq',
    model: 'qwen1.5-14b-chat-awq',
    apiKeyEnv: 'CLOUDFLARE_API_KEY',
    maxTokens: 4096,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'open-source-free',
  },

  // Qwen 2.5 via DashScope
  'qwen-2.5': {
    name: 'Qwen 2.5 (72B)',
    provider: 'alibaba',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    maxTokens: 8192,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'open-source',
  },

  // Qwen via Fireworks
  'qwen-2.5-fireworks': {
    name: 'Qwen 2.5 72B (Fireworks)',
    provider: 'fireworks',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    model: 'accounts/fireworks/models/qwen2p5-72b-instruct',
    apiKeyEnv: 'FIREWORKS_API_KEY',
    maxTokens: 8192,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'open-source',
  },

  // Mistral via their API
  'mistral-large': {
    name: 'Mistral Large',
    provider: 'mistral',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    apiKeyEnv: 'MISTRAL_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'multilingual'],
    tier: 'open-source',
  },

  // === COMMERCIAL MODELS (FALLBACK) ===
  'claude-sonnet': {
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'planning', 'synthesis'],
    tier: 'premium',
    isAnthropic: true,
  },

  // === LOVABLE AI (Ultimate fallback - always available) ===
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'lovable',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-flash',
    apiKeyEnv: 'LOVABLE_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'multimodal', 'synthesis'],
    tier: 'fallback',
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    provider: 'lovable',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    model: 'google/gemini-2.5-pro',
    apiKeyEnv: 'LOVABLE_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'multimodal', 'complex_analysis'],
    tier: 'premium',
  },
} as const;

type ModelId = keyof typeof MODEL_CONFIGS;

// ============ ORCHESTRATION PATTERNS ============

// LangGraph pattern: Graph-based workflow with state
interface LangGraphState {
  messages: any[];
  currentNode: string;
  context: Record<string, any>;
  history: string[];
}

// CrewAI pattern: Role-based agents
interface CrewAgent {
  role: string;
  goal: string;
  backstory: string;
  model: ModelId;
}

// Mastra pattern: Production-ready with monitoring
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
  preferOpenSource?: boolean;
  // CrewAI specific
  agents?: CrewAgent[];
  // Mastra specific
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
      preferOpenSource: request.preferOpenSource,
    });

    // Select model based on task if not specified
    let modelId = request.model === 'auto' || !request.model 
      ? selectModelForTask(request.task, request.preferOpenSource)
      : request.model;

    // Build fallback chain prioritizing open source
    const fallbackChain = request.fallbackChain || buildFallbackChain(modelId, request.preferOpenSource);
    const usedFallbacks: string[] = [];

    // Try models in order until one succeeds
    for (const tryModelId of [modelId, ...fallbackChain]) {
      const config = MODEL_CONFIGS[tryModelId];
      if (!config) continue;

      const apiKey = Deno.env.get(config.apiKeyEnv);

      if (!apiKey) {
        console.log(`[LLM Router] No API key for ${config.name}, trying fallback...`);
        usedFallbacks.push(tryModelId);
        continue;
      }

      try {
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
      error: 'All models in fallback chain failed',
      model: 'none',
      provider: 'none',
      content: '',
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

function selectModelForTask(task?: string, preferOpenSource?: boolean): ModelId {
  // Prioritize OpenAI if available and not preferring open source
  const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
  const hasGroq = !!Deno.env.get('GROQ_API_KEY');
  const hasDeepSeek = !!Deno.env.get('DEEPSEEK_API_KEY');
  const hasClaude = !!Deno.env.get('ANTHROPIC_API_KEY');

  if (preferOpenSource) {
    // Try open source first
    if (hasGroq) return 'llama-3.3-70b-groq';
    if (hasDeepSeek) return 'deepseek-v3';
  }

  switch (task) {
    case 'reasoning':
      if (hasOpenAI) return 'gpt-4o';
      if (hasDeepSeek) return 'deepseek-v3';
      if (hasGroq) return 'llama-3.3-70b-groq';
      return 'gemini-2.5-pro';
      
    case 'coding':
      if (hasDeepSeek) return 'deepseek-v3';
      if (hasOpenAI) return 'gpt-4o';
      if (hasGroq) return 'llama-3.3-70b-groq';
      return 'gemini-2.5-flash';
      
    case 'planning':
      if (hasClaude) return 'claude-sonnet';
      if (hasOpenAI) return 'gpt-4o';
      return 'gemini-2.5-pro';
      
    case 'synthesis':
      if (hasOpenAI) return 'gpt-4o';
      if (hasClaude) return 'claude-sonnet';
      return 'gemini-2.5-pro';
      
    case 'research':
      if (hasOpenAI) return 'gpt-4o';
      if (hasGroq) return 'llama-3.3-70b-groq';
      return 'gemini-2.5-flash';
      
    default:
      // Default priority: OpenAI > Groq (free Llama) > DeepSeek > Gemini
      if (hasOpenAI) return 'gpt-4o-mini';
      if (hasGroq) return 'llama-3.3-70b-groq';
      if (hasDeepSeek) return 'deepseek-v3';
      return 'gemini-2.5-flash';
  }
}

function buildFallbackChain(primary: ModelId, preferOpenSource?: boolean): ModelId[] {
  const chain: ModelId[] = [];

  // Priority order - OpenAI first since user has API key, then open source free tiers
  const priorityOrder: ModelId[] = preferOpenSource
    ? [
        // Open source first
        'llama-3.3-70b-groq',
        'deepseek-v3',
        'llama-3.1-70b-hf',
        'llama-3.3-70b',
        'qwen-2.5-fireworks',
        'qwen-2.5',
        'mistral-large',
        // Then commercial
        'gpt-4o',
        'gpt-4o-mini',
        'claude-sonnet',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
      ]
    : [
        // Commercial first (OpenAI has key)
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'claude-sonnet',
        // Then open source
        'llama-3.3-70b-groq',
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
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  // Handle Anthropic's different API format
  if ((config as any).isAnthropic) {
    return callAnthropic(config, apiKey, request);
  }

  // Handle HuggingFace
  if (config.provider === 'huggingface') {
    return callHuggingFace(config, apiKey, request);
  }

  // Handle Cloudflare Workers AI
  if (config.provider === 'cloudflare') {
    return callCloudflare(config, apiKey, request);
  }

  // Standard OpenAI-compatible API
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

async function callAnthropic(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  // Convert messages to Anthropic format
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

async function callHuggingFace(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  // Convert to HuggingFace format
  const prompt = request.messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n') + '\nassistant:';

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: Math.min(request.maxTokens || 1024, config.maxTokens),
        temperature: request.temperature ?? 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';

  return {
    success: true,
    content,
  };
}

async function callCloudflare(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  
  const accountId = Deno.env.get('CF_ACCOUNT_ID');
  if (!accountId) {
    throw new Error('CF_ACCOUNT_ID not configured');
  }

  const endpoint = config.endpoint.replace('${CF_ACCOUNT_ID}', accountId);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: request.messages,
      max_tokens: Math.min(request.maxTokens || 1024, config.maxTokens),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    content: data.result?.response || '',
  };
}

// ============ ORCHESTRATION PATTERNS ============

// LangGraph pattern: Stateful graph execution
async function executeLangGraph(
  config: typeof MODEL_CONFIGS[ModelId],
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

  // Graph nodes
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

    // Add assistant response for next iteration
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

// CrewAI pattern: Role-based agent collaboration
async function executeCrewAI(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  console.log('[CrewAI] Executing role-based multi-agent workflow');

  const defaultAgents: CrewAgent[] = request.agents || [
    {
      role: 'Researcher',
      goal: 'Gather comprehensive information from multiple sources',
      backstory: 'Expert researcher with experience in data collection and verification',
      model: 'gpt-4o' as ModelId,
    },
    {
      role: 'Analyst',
      goal: 'Analyze data and identify patterns, insights, and contradictions',
      backstory: 'Senior analyst skilled in critical thinking and data interpretation',
      model: 'claude-sonnet' as ModelId,
    },
    {
      role: 'Writer',
      goal: 'Produce clear, accurate, and well-structured reports',
      backstory: 'Professional technical writer with expertise in research communication',
      model: 'gpt-4o' as ModelId,
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

// Mastra pattern: Production-ready with retries and monitoring
async function executeMastra(
  config: typeof MODEL_CONFIGS[ModelId],
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), mastraConfig.timeout);

      const result = await callModel(config, apiKey, request);
      clearTimeout(timeoutId);

      if (result.success) {
        console.log(`[Mastra] Success on attempt ${attempt}`);
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[Mastra] Attempt ${attempt} failed:`, lastError.message);
      
      // Exponential backoff
      if (attempt < mastraConfig.retryPolicy.maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, mastraConfig.retryPolicy.backoffMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  throw lastError || new Error('Mastra workflow failed after all retries');
}

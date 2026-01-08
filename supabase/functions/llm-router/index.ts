import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========================================
// MANUS 1.7 MAX - UNIFIED LLM ROUTER
// ========================================
// Routes to: DeepSeek-V3, Qwen 2.5, Llama 3.3 70B, Claude, GPT-5, Gemini
// Orchestration framework patterns: LangGraph, CrewAI, Mastra
// With intelligent fallback chain

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ MODEL CONFIGURATIONS ============

const MODEL_CONFIGS = {
  // === OPEN SOURCE MODELS ===
  'deepseek-v3': {
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'planning', 'tool_use'],
    tier: 'primary',
  },
  'qwen-2.5': {
    name: 'Qwen 2.5 (72B)',
    provider: 'alibaba',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    maxTokens: 8192,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'primary',
  },
  'llama-3.3-70b': {
    name: 'Llama 3.3 70B Instruct',
    provider: 'meta',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    apiKeyEnv: 'TOGETHER_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'primary',
  },
  // Groq for Llama (faster)
  'llama-3.3-70b-groq': {
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    tier: 'primary',
  },
  // Fireworks for Qwen
  'qwen-2.5-fireworks': {
    name: 'Qwen 2.5 72B (Fireworks)',
    provider: 'fireworks',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    model: 'accounts/fireworks/models/qwen2p5-72b-instruct',
    apiKeyEnv: 'FIREWORKS_API_KEY',
    maxTokens: 8192,
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    tier: 'primary',
  },

  // === COMMERCIAL MODELS ===
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
  'gpt-5': {
    name: 'GPT-5',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-5-2025-08-07',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 8192,
    capabilities: ['reasoning', 'coding', 'multimodal'],
    tier: 'premium',
  },
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    capabilities: ['reasoning', 'coding', 'multimodal'],
    tier: 'fallback',
  },

  // === LOVABLE AI (Always available) ===
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
    });

    // Select model based on task if not specified
    let modelId = request.model === 'auto' || !request.model 
      ? selectModelForTask(request.task)
      : request.model;

    // Build fallback chain
    const fallbackChain = request.fallbackChain || buildFallbackChain(modelId);
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

function selectModelForTask(task?: string): ModelId {
  switch (task) {
    case 'reasoning':
      return 'deepseek-v3'; // Best for complex reasoning
    case 'coding':
      return 'deepseek-v3'; // Excellent at code
    case 'planning':
      return 'claude-sonnet'; // Great for planning
    case 'synthesis':
      return 'gemini-2.5-pro'; // Strong synthesis capabilities
    case 'research':
      return 'qwen-2.5'; // Good at tool use for research
    default:
      return 'gemini-2.5-flash'; // Fast default
  }
}

function buildFallbackChain(primary: ModelId): ModelId[] {
  const chain: ModelId[] = [];

  // Priority order based on capability and availability
  const priorityOrder: ModelId[] = [
    'deepseek-v3',
    'llama-3.3-70b-groq',
    'llama-3.3-70b',
    'qwen-2.5-fireworks',
    'qwen-2.5',
    'claude-sonnet',
    'gpt-4o',
    'gemini-2.5-pro',
    'gemini-2.5-flash', // Always last as ultimate fallback
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
      return 'Break down the query into sub-questions and identify key entities.';
    case 'plan':
      return 'Create a research plan with specific sources and methods.';
    case 'execute':
      return 'Execute the research plan and gather information.';
    case 'observe':
      return 'Validate findings and identify contradictions.';
    case 'synthesize':
      return 'Synthesize all findings into a coherent response with citations.';
    default:
      return 'Process the current task.';
  }
}

// CrewAI pattern: Role-based multi-agent
async function executeCrewAI(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  console.log('[CrewAI] Executing role-based multi-agent workflow');

  const defaultAgents: CrewAgent[] = [
    {
      role: 'Researcher',
      goal: 'Find accurate and comprehensive information',
      backstory: 'Expert at discovering and analyzing data from multiple sources',
      model: 'deepseek-v3',
    },
    {
      role: 'Analyst',
      goal: 'Verify claims and identify contradictions',
      backstory: 'Skilled at critical analysis and fact-checking',
      model: 'qwen-2.5',
    },
    {
      role: 'Writer',
      goal: 'Synthesize findings into clear reports',
      backstory: 'Professional at creating structured, evidence-based reports',
      model: 'claude-sonnet',
    },
  ];

  const agents = request.agents || defaultAgents;
  let agentOutputs: string[] = [];
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  for (const agent of agents) {
    const agentPrompt = {
      role: 'system',
      content: `You are a ${agent.role}. Your goal: ${agent.goal}. Background: ${agent.backstory}. 
Previous agent outputs: ${agentOutputs.join('\n\n')}
Provide your contribution based on your role.`,
    };

    const result = await callModel(config, apiKey, {
      ...request,
      messages: [agentPrompt, ...request.messages],
    });

    if (result.success) {
      agentOutputs.push(`[${agent.role}]: ${result.content}`);
      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens || 0;
        totalUsage.completionTokens += result.usage.completionTokens || 0;
        totalUsage.totalTokens += result.usage.totalTokens || 0;
      }
    }
  }

  return {
    success: true,
    content: agentOutputs.join('\n\n---\n\n'),
    usage: totalUsage,
  };
}

// Mastra pattern: Production-ready with monitoring
async function executeMastra(
  config: typeof MODEL_CONFIGS[ModelId],
  apiKey: string,
  request: LLMRequest
): Promise<{ success: boolean; content: string; usage?: any }> {
  console.log('[Mastra] Executing production-ready workflow');

  const mastraConfig = request.mastraConfig || {
    enableMetrics: true,
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    timeout: 60000,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= mastraConfig.retryPolicy.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), mastraConfig.timeout);

      const result = await callModel(config, apiKey, request);

      clearTimeout(timeoutId);

      if (result.success) {
        console.log(`[Mastra] Success on attempt ${attempt + 1}`);
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      console.log(`[Mastra] Attempt ${attempt + 1} failed:`, error);

      if (attempt < mastraConfig.retryPolicy.maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, mastraConfig.retryPolicy.backoffMs * Math.pow(2, attempt))
        );
      }
    }
  }

  return {
    success: false,
    content: '',
    usage: undefined,
  };
}

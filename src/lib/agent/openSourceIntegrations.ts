// ========================================
// OPEN-SOURCE TOOL INTEGRATIONS
// ========================================
// Adds GPT-Researcher, crawl4ai, browser-use, DeepSeek, Qwen, OpenManus
// as additional capabilities to enhance Manus 1.7 MAX
// Based on: "Replicating Manus 1.6 Max: A Comprehensive Open-Source Guide"
// ========================================

// ============ FOUNDATION MODELS (OPEN-SOURCE) ============
// These are the recommended open-source LLMs for "Max" level reasoning
export interface OpenSourceModel {
  id: string;
  name: string;
  provider: 'deepseek' | 'meta' | 'alibaba' | 'anthropic' | 'openai';
  capabilities: ModelCapability[];
  apiEndpoint?: string;
  isDefault: boolean;
  description: string;
  contextWindow: number;
  pricing?: { input: number; output: number }; // per 1M tokens
}

export type ModelCapability = 
  | 'reasoning'
  | 'coding'
  | 'planning'
  | 'tool_use'
  | 'multimodal'
  | 'synthesis'
  | 'instruction_following';

export const OPEN_SOURCE_MODELS: OpenSourceModel[] = [
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    capabilities: ['reasoning', 'coding', 'planning', 'tool_use'],
    apiEndpoint: 'https://api.deepseek.com/v1',
    isDefault: true,
    description: 'Gold standard for open-source reasoning and coding. Primary brain for Manus.',
    contextWindow: 128000,
    pricing: { input: 0.14, output: 0.28 },
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    capabilities: ['reasoning', 'coding', 'instruction_following'],
    isDefault: false,
    description: 'Highly reliable for general-purpose agentic tasks. Wide community support.',
    contextWindow: 128000,
  },
  {
    id: 'qwen-2.5',
    name: 'Qwen 2.5',
    provider: 'alibaba',
    capabilities: ['tool_use', 'instruction_following', 'reasoning'],
    apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1',
    isDefault: false,
    description: 'Excellent at following complex instructions and tool use. Alibaba-developed.',
    contextWindow: 128000,
  },
  {
    id: 'claude-3.7',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    capabilities: ['planning', 'synthesis', 'reasoning', 'coding'],
    apiEndpoint: 'https://api.anthropic.com/v1',
    isDefault: false,
    description: 'Best for planning and synthesis tasks. Anthropic flagship.',
    contextWindow: 200000,
  },
];

// ============ ORCHESTRATION FRAMEWORKS ============
export interface OrchestrationFramework {
  id: string;
  name: string;
  type: 'graph' | 'role_based' | 'production';
  githubUrl: string;
  description: string;
  features: string[];
  useCase: string;
}

export const ORCHESTRATION_FRAMEWORKS: OrchestrationFramework[] = [
  {
    id: 'langgraph',
    name: 'LangGraph',
    type: 'graph',
    githubUrl: 'https://github.com/langchain-ai/langgraph',
    description: 'Complex, stateful, and cyclic agentic workflows with fine-grained control.',
    features: ['graph_based_workflow', 'state_management', 'cyclic_loops', 'tool_integration'],
    useCase: 'Core agent loop (Analyze → Plan → Execute → Observe)',
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    type: 'role_based',
    githubUrl: 'https://github.com/crewAIInc/crewAI',
    description: 'Role-based multi-agent systems with collaborative goal pursuit.',
    features: ['role_assignment', 'agent_collaboration', 'task_delegation', 'memory_sharing'],
    useCase: 'Multi-agent research teams (NewsAgent, ResearchAgent, etc.)',
  },
  {
    id: 'mastra',
    name: 'Mastra',
    type: 'production',
    githubUrl: 'https://github.com/mastra-ai/mastra',
    description: 'High-performance framework for production-ready agents.',
    features: ['production_ready', 'high_performance', 'scalability', 'monitoring'],
    useCase: 'Production deployment of Manus agents',
  },
  {
    id: 'openmanus',
    name: 'OpenManus',
    type: 'role_based',
    githubUrl: 'https://github.com/FoundationAgents/OpenManus',
    description: 'Direct open-source replica of Manus with MCP tool integration.',
    features: ['mcp_integration', 'multi_agent_flows', 'rl_tuning', 'data_analysis_agent'],
    useCase: 'Direct Manus parity with community support',
  },
];

// ============ ACTION MECHANISMS ============
export interface ActionMechanism {
  id: string;
  name: string;
  type: 'codeact' | 'browser' | 'scraping';
  githubUrl: string;
  description: string;
  capabilities: string[];
}

export const ACTION_MECHANISMS: ActionMechanism[] = [
  {
    id: 'codeact',
    name: 'CodeAct',
    type: 'codeact',
    githubUrl: 'https://github.com/xingyaoww/code-act',
    description: 'Agent outputs executable Python code for sandboxed execution.',
    capabilities: ['python_execution', 'shell_commands', 'file_operations', 'api_calls'],
  },
  {
    id: 'browser-use',
    name: 'browser-use',
    type: 'browser',
    githubUrl: 'https://github.com/browser-use/browser-use',
    description: 'LLM agent browser interaction built on Playwright.',
    capabilities: ['page_navigation', 'form_filling', 'element_interaction', 'screenshot', 'data_extraction'],
  },
  {
    id: 'playwright',
    name: 'Playwright',
    type: 'browser',
    githubUrl: 'https://github.com/microsoft/playwright',
    description: 'Reliable browser automation for web interaction.',
    capabilities: ['cross_browser', 'headless', 'screenshot', 'pdf_generation', 'network_interception'],
  },
  {
    id: 'crawl4ai',
    name: 'crawl4ai',
    type: 'scraping',
    githubUrl: 'https://github.com/unclecode/crawl4ai',
    description: 'LLM-friendly web crawling and data extraction.',
    capabilities: ['web_scraping', 'content_extraction', 'markdown_conversion', 'link_discovery', 'structured_output'],
  },
];

// ============ DEEP RESEARCH TOOLS ============
export interface DeepResearchTool {
  id: string;
  name: string;
  githubUrl: string;
  description: string;
  capabilities: string[];
  outputFormats: string[];
}

export const DEEP_RESEARCH_TOOLS: DeepResearchTool[] = [
  {
    id: 'gpt-researcher',
    name: 'GPT-Researcher',
    githubUrl: 'https://github.com/assafelovic/gpt-researcher',
    description: 'Autonomous agent for comprehensive online research.',
    capabilities: ['parallel_research', 'source_aggregation', 'fact_verification', 'report_generation'],
    outputFormats: ['markdown', 'pdf', 'docx', 'json'],
  },
  {
    id: 'open-deep-research',
    name: 'Open Deep Research',
    githubUrl: 'https://github.com/langchain-ai/open_deep_research',
    description: 'Template for orchestrating parallel research sub-agents.',
    capabilities: ['parallel_subagents', 'research_synthesis', 'multi_source', 'iterative_refinement'],
    outputFormats: ['markdown', 'json'],
  },
];

// ============ SANDBOX ENVIRONMENTS ============
export interface SandboxEnvironment {
  id: string;
  name: string;
  type: 'container' | 'vm' | 'wasm';
  description: string;
  features: string[];
  securityLevel: 'basic' | 'standard' | 'high';
}

export const SANDBOX_ENVIRONMENTS: SandboxEnvironment[] = [
  {
    id: 'docker',
    name: 'Docker',
    type: 'container',
    description: 'Industry standard containerization for isolated agent execution.',
    features: ['shell_access', 'file_system', 'network', 'python_runtime', 'node_runtime'],
    securityLevel: 'standard',
  },
  {
    id: 'firecracker',
    name: 'Firecracker',
    type: 'vm',
    description: 'Lightweight VM for stringent security isolation.',
    features: ['microvm', 'fast_boot', 'memory_isolation', 'secure_execution'],
    securityLevel: 'high',
  },
  {
    id: 'gvisor',
    name: 'gVisor',
    type: 'vm',
    description: 'User-space kernel for enhanced container security.',
    features: ['kernel_isolation', 'syscall_filtering', 'container_hardening'],
    securityLevel: 'high',
  },
  {
    id: 'pyodide',
    name: 'Pyodide (WASM)',
    type: 'wasm',
    description: 'Python in WebAssembly for browser-based execution.',
    features: ['browser_execution', 'python_stdlib', 'numpy', 'pandas'],
    securityLevel: 'basic',
  },
];

// ============ INTEGRATION CONFIGS ============
export interface OpenSourceIntegrationConfig {
  // Model selection
  primaryModel: string; // e.g., 'deepseek-v3'
  fallbackModels: string[];
  
  // Orchestration
  orchestrationFramework: string; // e.g., 'langgraph'
  
  // Action mechanisms
  enableCodeAct: boolean;
  enableBrowserUse: boolean;
  enableCrawl4ai: boolean;
  
  // Research tools
  enableGPTResearcher: boolean;
  enableOpenDeepResearch: boolean;
  
  // Sandbox
  sandboxType: 'docker' | 'firecracker' | 'pyodide' | 'none';
  
  // API keys (stored in secrets)
  apiKeys: {
    deepseek?: string;
    anthropic?: string;
    openai?: string;
  };
}

export const DEFAULT_INTEGRATION_CONFIG: OpenSourceIntegrationConfig = {
  primaryModel: 'deepseek-v3',
  fallbackModels: ['llama-3.3-70b', 'qwen-2.5'],
  orchestrationFramework: 'langgraph',
  enableCodeAct: true,
  enableBrowserUse: true,
  enableCrawl4ai: true,
  enableGPTResearcher: true,
  enableOpenDeepResearch: true,
  sandboxType: 'pyodide', // Browser-based for ORKESTRA compatibility
  apiKeys: {},
};

// ============ CONNECTOR INTERFACE ============
// This defines how to connect to each external tool/service

export interface ToolConnector {
  id: string;
  name: string;
  type: 'model' | 'framework' | 'action' | 'research' | 'sandbox';
  status: 'available' | 'configured' | 'active' | 'error';
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  endpoints: {
    health?: string;
    execute?: string;
    stream?: string;
  };
}

export function createToolConnectors(config: OpenSourceIntegrationConfig): ToolConnector[] {
  const connectors: ToolConnector[] = [];

  // Model connectors
  const primaryModel = OPEN_SOURCE_MODELS.find(m => m.id === config.primaryModel);
  if (primaryModel) {
    connectors.push({
      id: primaryModel.id,
      name: primaryModel.name,
      type: 'model',
      status: primaryModel.apiEndpoint ? 'available' : 'configured',
      requiresApiKey: true,
      apiKeyEnvVar: `${primaryModel.provider.toUpperCase()}_API_KEY`,
      endpoints: {
        execute: primaryModel.apiEndpoint,
      },
    });
  }

  // Action mechanism connectors
  if (config.enableCrawl4ai) {
    connectors.push({
      id: 'crawl4ai',
      name: 'crawl4ai',
      type: 'action',
      status: 'available',
      requiresApiKey: false,
      endpoints: {
        execute: '/api/crawl4ai',
      },
    });
  }

  if (config.enableBrowserUse) {
    connectors.push({
      id: 'browser-use',
      name: 'browser-use',
      type: 'action',
      status: 'available',
      requiresApiKey: false,
      endpoints: {
        execute: '/api/browser-use',
      },
    });
  }

  // Research tool connectors
  if (config.enableGPTResearcher) {
    connectors.push({
      id: 'gpt-researcher',
      name: 'GPT-Researcher',
      type: 'research',
      status: 'available',
      requiresApiKey: true,
      apiKeyEnvVar: 'OPENAI_API_KEY',
      endpoints: {
        execute: '/api/gpt-researcher',
        stream: '/api/gpt-researcher/stream',
      },
    });
  }

  return connectors;
}

// ============ HYBRID EXECUTION STRATEGY ============
// Combines ORKESTRA AI models with open-source tools

export interface HybridExecutionPlan {
  steps: HybridStep[];
  estimatedDuration: number;
  toolsUsed: string[];
}

export interface HybridStep {
  id: string;
  tool: string;
  action: string;
  input: any;
  fallbackTool?: string;
  timeout: number;
}

export function createHybridExecutionPlan(
  task: string,
  config: OpenSourceIntegrationConfig
): HybridExecutionPlan {
  const steps: HybridStep[] = [];
  const toolsUsed: string[] = [];

  // Step 1: Initial analysis with primary model
  steps.push({
    id: 'analyze',
    tool: config.primaryModel,
    action: 'analyze_task',
    input: { task },
    fallbackTool: config.fallbackModels[0],
    timeout: 30000,
  });
  toolsUsed.push(config.primaryModel);

  // Step 2: Web crawling with crawl4ai
  if (config.enableCrawl4ai) {
    steps.push({
      id: 'crawl',
      tool: 'crawl4ai',
      action: 'crawl_sources',
      input: { query: task },
      timeout: 60000,
    });
    toolsUsed.push('crawl4ai');
  }

  // Step 3: Deep research with GPT-Researcher
  if (config.enableGPTResearcher) {
    steps.push({
      id: 'research',
      tool: 'gpt-researcher',
      action: 'deep_research',
      input: { query: task },
      fallbackTool: 'open-deep-research',
      timeout: 120000,
    });
    toolsUsed.push('gpt-researcher');
  }

  // Step 4: Browser automation if needed
  if (config.enableBrowserUse) {
    steps.push({
      id: 'browse',
      tool: 'browser-use',
      action: 'interact_with_pages',
      input: { task },
      fallbackTool: 'playwright',
      timeout: 90000,
    });
    toolsUsed.push('browser-use');
  }

  // Step 5: CodeAct execution
  if (config.enableCodeAct) {
    steps.push({
      id: 'execute_code',
      tool: 'codeact',
      action: 'execute_python',
      input: { task },
      timeout: 30000,
    });
    toolsUsed.push('codeact');
  }

  return {
    steps,
    estimatedDuration: steps.reduce((sum, s) => sum + s.timeout, 0),
    toolsUsed,
  };
}

// ============ UTILITY FUNCTIONS ============

export function getModelById(id: string): OpenSourceModel | undefined {
  return OPEN_SOURCE_MODELS.find(m => m.id === id);
}

export function getFrameworkById(id: string): OrchestrationFramework | undefined {
  return ORCHESTRATION_FRAMEWORKS.find(f => f.id === id);
}

export function getMechanismById(id: string): ActionMechanism | undefined {
  return ACTION_MECHANISMS.find(m => m.id === id);
}

export function getResearchToolById(id: string): DeepResearchTool | undefined {
  return DEEP_RESEARCH_TOOLS.find(t => t.id === id);
}

export function getSandboxById(id: string): SandboxEnvironment | undefined {
  return SANDBOX_ENVIRONMENTS.find(s => s.id === id);
}

// Get all available capabilities
export function getAllCapabilities(): string[] {
  const capabilities = new Set<string>();
  
  OPEN_SOURCE_MODELS.forEach(m => m.capabilities.forEach(c => capabilities.add(c)));
  ACTION_MECHANISMS.forEach(m => m.capabilities.forEach(c => capabilities.add(c)));
  DEEP_RESEARCH_TOOLS.forEach(t => t.capabilities.forEach(c => capabilities.add(c)));
  
  return Array.from(capabilities);
}

// Check if a specific capability is available
export function hasCapability(capability: string, config: OpenSourceIntegrationConfig): boolean {
  const model = getModelById(config.primaryModel);
  if (model?.capabilities.includes(capability as ModelCapability)) return true;
  
  if (config.enableCrawl4ai) {
    const crawl4ai = getMechanismById('crawl4ai');
    if (crawl4ai?.capabilities.includes(capability)) return true;
  }
  
  if (config.enableGPTResearcher) {
    const gptResearcher = getResearchToolById('gpt-researcher');
    if (gptResearcher?.capabilities.includes(capability)) return true;
  }
  
  return false;
}

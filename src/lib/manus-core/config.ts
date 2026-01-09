/**
 * Manus 1.6 MAX - Complete Model & Tool Configuration
 * 
 * This file configures ALL models and tools for 100% real-time data fetching.
 * NO mock, synthesized, or dummy data is used anywhere in the system.
 */

// ============================================
// LLM MODEL CONFIGURATION
// ============================================

export const MANUS_MODELS = {
  // Tier 1: Premium Models - Best reasoning and planning
  CLAUDE_3_5_SONNET: {
    id: 'claude-3-5-sonnet',
    provider: 'anthropic',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    capabilities: ['reasoning', 'long-context', 'code', 'analysis'],
    maxTokens: 200000,
    costPer1kTokens: 3.0,
    useFor: ['complex-reasoning', 'long-documents', 'code-analysis'],
  },
  CLAUDE_3_7_SONNET: {
    id: 'claude-3-7-sonnet',
    provider: 'anthropic',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    capabilities: ['reasoning', 'long-context', 'extended-thinking', 'planning'],
    maxTokens: 200000,
    costPer1kTokens: 3.5,
    useFor: ['advanced-reasoning', 'multi-step-planning', 'critical-analysis'],
  },
  GPT_5: {
    id: 'gpt-5',
    provider: 'openai',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    capabilities: ['reasoning', 'vision', 'advanced-planning', 'multimodal'],
    maxTokens: 128000,
    costPer1kTokens: 4.0,
    useFor: ['advanced-tasks', 'vision-analysis', 'complex-planning'],
  },
  GPT_4O: {
    id: 'gpt-4o',
    provider: 'openai',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    capabilities: ['reasoning', 'vision', 'extended-thinking', 'fast'],
    maxTokens: 128000,
    costPer1kTokens: 2.5,
    useFor: ['general-tasks', 'vision', 'real-time-analysis'],
  },

  // Tier 2: Cost-Effective High Performance
  DEEPSEEK_V3: {
    id: 'deepseek-v3',
    provider: 'deepseek',
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    capabilities: ['reasoning', 'code', 'math', 'cost-effective', 'fast'],
    maxTokens: 64000,
    costPer1kTokens: 0.27,
    useFor: ['coding', 'math', 'cost-sensitive-tasks', 'rapid-iteration'],
  },
  GEMINI_2_0_FLASH: {
    id: 'gemini-2.0-flash',
    provider: 'google',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
    capabilities: ['multimodal', 'fast', 'vision', 'real-time'],
    maxTokens: 1000000,
    costPer1kTokens: 0.5,
    useFor: ['fast-responses', 'real-time-tasks', 'multimodal-analysis'],
  },
  GEMINI_2_0_PRO: {
    id: 'gemini-2.0-pro',
    provider: 'google',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-pro:generateContent',
    capabilities: ['multimodal', 'reasoning', 'vision', 'long-context'],
    maxTokens: 1000000,
    costPer1kTokens: 1.5,
    useFor: ['complex-multimodal', 'long-documents', 'vision-reasoning'],
  },

  // Tier 3: Open Source Models
  LLAMA_4_SCOUT_17B: {
    id: 'llama-4-scout-17b-16e',
    provider: 'together',
    apiEndpoint: 'https://api.together.xyz/v1/chat/completions',
    capabilities: ['coding', 'reasoning', 'moe', 'efficient'],
    maxTokens: 32000,
    costPer1kTokens: 0.6,
    useFor: ['coding', 'open-source-tasks', 'cost-optimization'],
  },
  QWEN_2_5_72B: {
    id: 'qwen-2.5-72b',
    provider: 'together',
    apiEndpoint: 'https://api.together.xyz/v1/chat/completions',
    capabilities: ['multilingual', 'reasoning', 'code', 'chinese'],
    maxTokens: 32000,
    costPer1kTokens: 0.9,
    useFor: ['multilingual', 'chinese-content', 'coding'],
  },
  QWEN_2_5_CODER_32B: {
    id: 'qwen-2.5-coder-32b',
    provider: 'together',
    apiEndpoint: 'https://api.together.xyz/v1/chat/completions',
    capabilities: ['coding', 'reasoning', 'code-generation'],
    maxTokens: 32000,
    costPer1kTokens: 0.7,
    useFor: ['code-generation', 'code-analysis', 'debugging'],
  },
} as const;

// ============================================
// TOOL CONFIGURATION - 100% REAL-TIME DATA
// ============================================

export const MANUS_TOOLS = {
  BROWSER_USE: {
    id: 'browser-use',
    name: 'Browser-Use',
    description: 'LLM-guided autonomous web browsing for real-time data extraction',
    capabilities: ['web-browsing', 'llm-guided', 'interactive', 'javascript-execution'],
    dataType: 'REAL-TIME', // Confirms real-time data only
    apiEndpoint: null, // Library-based tool
    useFor: ['dynamic-websites', 'interactive-content', 'js-heavy-sites'],
  },
  PLAYWRIGHT: {
    id: 'playwright',
    name: 'Playwright',
    description: 'Browser automation for reliable real-time web scraping',
    capabilities: ['browser-automation', 'screenshots', 'pdf-generation', 'multi-browser'],
    dataType: 'REAL-TIME', // Confirms real-time data only
    apiEndpoint: null, // Library-based tool
    useFor: ['structured-scraping', 'screenshots', 'form-submission'],
  },
  CRAWL4AI: {
    id: 'crawl4ai',
    name: 'Crawl4AI',
    description: 'AI-powered web crawling with intelligent extraction of real-time data',
    capabilities: ['ai-extraction', 'content-parsing', 'structured-data', 'semantic-understanding'],
    dataType: 'REAL-TIME', // Confirms real-time data only
    apiEndpoint: null, // Library-based tool
    useFor: ['content-extraction', 'semantic-parsing', 'article-scraping'],
  },
  CODEACT: {
    id: 'codeact',
    name: 'CodeAct',
    description: 'Generate and execute code for custom real-time data fetching',
    capabilities: ['code-generation', 'code-execution', 'custom-logic', 'api-integration'],
    dataType: 'REAL-TIME', // Confirms real-time data only
    apiEndpoint: null, // Execution-based tool
    useFor: ['custom-apis', 'complex-logic', 'data-transformation'],
  },
  GPT_RESEARCH: {
    id: 'gpt-research',
    name: 'GPT Research',
    description: 'Multi-source research engine for comprehensive real-time information gathering',
    capabilities: ['multi-source', 'research', 'aggregation', 'verification'],
    dataType: 'REAL-TIME', // Confirms real-time data only
    apiEndpoint: null, // Multi-tool orchestrator
    useFor: ['research-tasks', 'fact-checking', 'comprehensive-analysis'],
  },
  OPENAI_WEB_RESEARCHER: {
    id: 'openai-web-researcher',
    name: 'OpenAI Web Researcher',
    description: 'OpenAI-powered web research for real-time information discovery',
    capabilities: ['ai-research', 'web-search', 'source-discovery', 'fact-verification'],
    dataType: 'REAL-TIME', // Confirms real-time data only
    apiEndpoint: 'https://api.openai.com/v1/chat/completions', // Uses OpenAI API with web access
    useFor: ['web-research', 'fact-finding', 'source-discovery'],
  },
} as const;

// ============================================
// DATA FETCHING CONFIGURATION
// ============================================

export const DATA_FETCH_CONFIG = {
  // NO mock data allowed
  ALLOW_MOCK_DATA: false,
  ALLOW_SYNTHETIC_DATA: false,
  ALLOW_DUMMY_DATA: false,
  
  // Only real-time sources
  REQUIRE_REAL_TIME: true,
  REQUIRE_LIVE_SOURCES: true,
  
  // Source validation
  VERIFY_SOURCE_FRESHNESS: true,
  MAX_AGE_MINUTES: 60, // Data older than 1 hour is considered stale
  
  // Fetching strategy
  PARALLEL_TOOLS: true, // Run all tools in parallel for speed
  TOOL_TIMEOUT_MS: 30000, // 30 second timeout per tool
  MAX_RETRIES: 3,
  
  // Quality checks
  VERIFY_DATA_AUTHENTICITY: true,
  CROSS_REFERENCE_SOURCES: true,
  MIN_CONFIDENCE_SCORE: 0.7,
} as const;

// ============================================
// MODEL SELECTION STRATEGY
// ============================================

export const MODEL_SELECTION_STRATEGY = {
  // Task-based selection
  'complex-reasoning': ['claude-3-7-sonnet', 'gpt-5', 'claude-3-5-sonnet'],
  'coding': ['qwen-2.5-coder-32b', 'deepseek-v3', 'llama-4-scout-17b-16e'],
  'fast-tasks': ['gemini-2.0-flash', 'gpt-4o', 'deepseek-v3'],
  'multimodal': ['gemini-2.0-pro', 'gpt-5', 'gpt-4o'],
  'cost-sensitive': ['deepseek-v3', 'gemini-2.0-flash', 'qwen-2.5-72b'],
  'multilingual': ['qwen-2.5-72b', 'gemini-2.0-pro', 'claude-3-5-sonnet'],
  
  // Failover chain (order matters)
  failover: [
    'claude-3-7-sonnet',
    'gpt-5',
    'claude-3-5-sonnet',
    'gpt-4o',
    'deepseek-v3',
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'qwen-2.5-72b',
  ],
} as const;

// ============================================
// TOOL SELECTION STRATEGY
// ============================================

export const TOOL_SELECTION_STRATEGY = {
  // Website type to tool mapping
  'dynamic-js-site': ['browser-use', 'playwright'],
  'static-content': ['crawl4ai', 'playwright'],
  'api-endpoint': ['codeact', 'openai-web-researcher'],
  'research-task': ['gpt-research', 'openai-web-researcher', 'browser-use'],
  'news-scraping': ['crawl4ai', 'browser-use', 'playwright'],
  
  // All tools for comprehensive fetching (use all in parallel)
  'comprehensive': [
    'browser-use',
    'playwright',
    'crawl4ai',
    'codeact',
    'gpt-research',
    'openai-web-researcher',
  ],
} as const;

// ============================================
// EXPORT HELPERS
// ============================================

export function getAllModels() {
  return Object.values(MANUS_MODELS);
}

export function getAllTools() {
  return Object.values(MANUS_TOOLS);
}

export function getModelsByCapability(capability: string) {
  return Object.values(MANUS_MODELS).filter(m => 
    m.capabilities.includes(capability as any)
  );
}

export function getToolsByCapability(capability: string) {
  return Object.values(MANUS_TOOLS).filter(t => 
    t.capabilities.includes(capability as any)
  );
}

export function isRealTimeDataOnly(): boolean {
  return DATA_FETCH_CONFIG.REQUIRE_REAL_TIME && 
         !DATA_FETCH_CONFIG.ALLOW_MOCK_DATA &&
         !DATA_FETCH_CONFIG.ALLOW_SYNTHETIC_DATA &&
         !DATA_FETCH_CONFIG.ALLOW_DUMMY_DATA;
}

// Validation function
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (DATA_FETCH_CONFIG.ALLOW_MOCK_DATA) {
    errors.push('Mock data is enabled - should be disabled for real-time operation');
  }
  
  if (DATA_FETCH_CONFIG.ALLOW_SYNTHETIC_DATA) {
    errors.push('Synthetic data is enabled - should be disabled for real-time operation');
  }
  
  if (DATA_FETCH_CONFIG.ALLOW_DUMMY_DATA) {
    errors.push('Dummy data is enabled - should be disabled for real-time operation');
  }
  
  if (!DATA_FETCH_CONFIG.REQUIRE_REAL_TIME) {
    errors.push('Real-time data requirement is disabled - should be enabled');
  }
  
  // Check all tools are configured for real-time
  const nonRealTimeTools = Object.values(MANUS_TOOLS).filter(t => t.dataType !== 'REAL-TIME');
  if (nonRealTimeTools.length > 0) {
    errors.push(`Tools not configured for real-time: ${nonRealTimeTools.map(t => t.id).join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log configuration on import
console.log('🚀 Manus 1.6 MAX Configuration Loaded');
console.log(`📊 Models configured: ${Object.keys(MANUS_MODELS).length}`);
console.log(`🛠️  Tools configured: ${Object.keys(MANUS_TOOLS).length}`);
console.log(`✅ Real-time data only: ${isRealTimeDataOnly()}`);

const validation = validateConfiguration();
if (!validation.valid) {
  console.warn('⚠️  Configuration warnings:', validation.errors);
} else {
  console.log('✅ Configuration validated - 100% real-time data mode');
}

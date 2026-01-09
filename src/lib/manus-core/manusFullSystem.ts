/**
 * MANUS 1.6 MAX - Full System Integration
 * Combines all components into a cohesive autonomous agent system
 */

import { executeAgentLoop, type AgentContext } from './agentLoop';
import { getRealtimeNews, type FetchedArticle } from './realTimeNews';
import { AgentMemoryStore } from './memory';
import { WideResearchOrchestrator, type ConsensusResult } from './wideResearchCore';

export interface ManusConfig {
  models: string[];
  tools: string[];
  memorySize: number;
  maxIterations: number;
  sessionId?: string;
}

export class ManusFullSystem {
  config: ManusConfig;
  memory: AgentMemoryStore;
  research: WideResearchOrchestrator;

  constructor(config: ManusConfig) {
    this.config = config;
    this.memory = new AgentMemoryStore(config.sessionId || `session_${Date.now()}`);
    this.research = new WideResearchOrchestrator();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing MANUS 1.6 MAX system...');
    console.log(`📊 Models: ${this.config.models.join(', ')}`);
    console.log(`🛠️ Tools: ${this.config.tools.join(', ')}`);
    console.log(`💾 Memory size: ${this.config.memorySize}`);
    console.log(`🔄 Max iterations: ${this.config.maxIterations}`);
    // Initialize all components
  }

  async execute(goal: string): Promise<{
    success: boolean;
    result: unknown;
    iterations: number;
    news?: FetchedArticle[];
    research?: ConsensusResult;
  }> {
    console.log(`🎯 Executing goal: ${goal}`);
    
    // Store goal in memory
    await this.memory.store(goal, 'decision', { type: 'user_goal' });
    
    // Execute agent loop
    const agentResult = await executeAgentLoop(goal, this.config.maxIterations);
    
    // Optionally fetch related news
    const news = await getRealtimeNews(goal, 10);
    
    // Optionally run wide research
    const research = await this.research.research(goal, 'comprehensive');
    
    // Store results in memory
    await this.memory.store(JSON.stringify(agentResult), 'experience', {
      goal,
      success: agentResult.success,
    });
    
    return {
      success: agentResult.success,
      result: agentResult,
      iterations: agentResult.iterations,
      news,
      research,
    };
  }

  async getMemoryContext(query: string): Promise<string> {
    return this.memory.retrieveContext(query);
  }

  async recall(query: string) {
    return this.memory.recall(query);
  }
}

export function createManusInstance(config: Partial<ManusConfig> = {}): ManusFullSystem {
  const defaultConfig: ManusConfig = {
    models: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-2.0', 'llama-70b', 'qwen-2.5-72b'],
    tools: ['browser-use', 'playwright', 'crawl4ai', 'codeact', 'gpt-research'],
    memorySize: 100,
    maxIterations: 5,
    ...config,
  };
  
  return new ManusFullSystem(defaultConfig);
}

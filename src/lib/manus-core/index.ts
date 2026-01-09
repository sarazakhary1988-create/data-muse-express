/**
 * MANUS 1.6 MAX - Core Module Exports
 * 
 * This module provides the foundational components of the Manus 1.6 Max architecture:
 * - Agent Loop: 4-phase orchestration (Analyze → Plan → Execute → Observe)
 * - Real-Time News: Autonomous news fetching using 5 tools
 * - Memory & RAG: Hybrid memory with semantic search
 * - Wide Research: 6 specialist agents with consensus building
 * - LLM Router: Multi-model orchestration with failover
 * - Manus Full System: Complete integrated system
 */

// Agent Loop - 4-Phase Orchestration
export {
  executeAgentLoop,
  analyzePhase,
  planPhase,
  executePhase,
  observePhase,
  type AgentContext,
  type AgentStep,
} from './agentLoop';

// Real-Time News Engine
export {
  getRealtimeNews,
  subscribeToNews,
  getTrendingNews,
  discoverNewsSourcesViaGPT,
  fetchViaBrowserUse,
  fetchViaPlaywright,
  fetchViaCrawl4AI,
  fetchViaCodeAct,
  type NewsSource,
  type FetchedArticle,
} from './realTimeNews';

// Memory & RAG System
export {
  MemoryManager,
  RAGSystem,
  AgentMemoryStore,
  type MemoryItem,
} from './memory';

// Wide Research
export {
  ResearchAgent,
  WideResearchOrchestrator,
  type ResearchFinding,
  type ConsensusResult,
} from './wideResearchCore';

// Full System Integration
export {
  ManusFullSystem,
  createManusInstance,
  type ManusConfig,
} from './manusFullSystem';

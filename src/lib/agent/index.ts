// Agent System - Main exports

export * from './types';
export { AgentStateMachine, agentStateMachine } from './stateMachine';
export { PlanningAgent, planningAgent } from './planningAgent';
export { CriticAgent, criticAgent } from './criticAgent';
export { MemorySystem, memorySystem } from './memorySystem';
export { DecisionEngine, decisionEngine } from './decisionEngine';
export { ParallelExecutor, parallelExecutor } from './parallelExecutor';
export { ResearchAgent, researchAgent } from './researchAgent';
export type { AgentResearchResult, ResearchAgentCallbacks } from './researchAgent';

// Manus-inspired validation and consolidation
export { SourceAuthorityManager, sourceAuthorityManager } from './sourceAuthority';
export type { SourceAuthority, SourceCategory } from './sourceAuthority';
export { CrossReferenceValidator, crossReferenceValidator } from './crossReferenceValidator';
export type { FieldValidation, ValidationResult, DiscrepancyDetail } from './crossReferenceValidator';
export { DataConsolidator, dataConsolidator } from './dataConsolidator';
export type { ConsolidatedResult, QualityMetrics, SourceCoverage, Discrepancy } from './dataConsolidator';

// Manus 1.6 MAX Wide Research
export { executeWideResearch, wideResearch } from './wideResearch';
export type { 
  WideResearchConfig, 
  WideResearchResult, 
  WideResearchCallbacks,
  SubAgentResult,
  WebSource,
  ExtractedContent
} from './wideResearch';

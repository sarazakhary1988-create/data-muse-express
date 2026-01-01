// Agent System Types

export type AgentState = 
  | 'idle'
  | 'planning'
  | 'searching'
  | 'scraping'
  | 'analyzing'
  | 'verifying'
  | 'compiling'
  | 'completed'
  | 'failed';

export interface ResearchPlan {
  id: string;
  query: string;
  strategy: ResearchStrategy;
  steps: PlanStep[];
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  adaptations: PlanAdaptation[];
}

export interface ResearchStrategy {
  approach: 'breadth-first' | 'depth-first' | 'hybrid';
  sourceTypes: SourceType[];
  verificationLevel: 'basic' | 'standard' | 'thorough';
  maxSources: number;
  parallelism: number;
}

export type SourceType = 'official' | 'news' | 'academic' | 'social' | 'regulatory' | 'financial';

export interface PlanStep {
  id: string;
  type: 'search' | 'scrape' | 'analyze' | 'verify' | 'enrich';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  description: string;
  dependencies: string[];
  result?: any;
  confidence?: number;
  duration?: number;
}

export interface PlanAdaptation {
  timestamp: Date;
  reason: string;
  changes: string[];
}

export interface ClaimVerification {
  id: string;
  claim: string;
  sources: VerificationSource[];
  confidence: number;
  status: 'verified' | 'partially_verified' | 'unverified' | 'contradicted';
  explanation: string;
}

export interface VerificationSource {
  url: string;
  domain: string;
  supportLevel: 'strong' | 'moderate' | 'weak' | 'contradicts';
  excerpt: string;
  timestamp?: Date;
}

export interface QualityScore {
  overall: number;
  accuracy: number;
  completeness: number;
  freshness: number;
  sourceQuality: number;
  claimVerification: number;
}

export interface ExtractedData {
  companies: Array<{
    name: string;
    ticker?: string;
    market?: string;
    action?: string;
    date?: string;
    value?: string;
    source_url?: string;
  }>;
  key_dates: Array<{
    date: string;
    event: string;
    entity?: string;
  }>;
  key_facts: Array<{
    fact: string;
    confidence?: 'high' | 'medium' | 'low';
    source?: string;
  }>;
  numeric_data: Array<{
    metric: string;
    value: string;
    unit?: string;
    context?: string;
  }>;
}

export interface FieldConfidence {
  field: string;
  value: any;
  confidence: number;
  sources: string[];
  verificationStatus: ClaimVerification['status'];
}

export interface AgentMemory {
  id: string;
  type: 'success' | 'failure' | 'pattern' | 'source_quality';
  query: string;
  context: Record<string, any>;
  outcome: string;
  learnings: string[];
  timestamp: Date;
  relevanceScore: number;
}

export interface DecisionContext {
  currentState: AgentState;
  plan: ResearchPlan | null;
  progress: number;
  results: any[];
  quality: QualityScore;
  timeElapsed: number;
  errors: AgentError[];
}

export interface AgentDecision {
  action: AgentAction;
  reason: string;
  confidence: number;
  alternativeActions: AgentAction[];
}

export type AgentAction = 
  | { type: 'continue' }
  | { type: 'retry'; target: string }
  | { type: 'adapt'; changes: string[] }
  | { type: 'escalate'; reason: string }
  | { type: 'complete' }
  | { type: 'fail'; reason: string }
  | { type: 'parallel_search'; queries: string[] }
  | { type: 'deep_dive'; url: string }
  | { type: 'verify_claim'; claim: string };

export interface AgentError {
  id: string;
  type: 'network' | 'parsing' | 'timeout' | 'rate_limit' | 'quality' | 'unknown';
  message: string;
  recoverable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ParallelTask {
  id: string;
  type: 'search' | 'scrape' | 'analyze' | 'verify';
  status: 'queued' | 'running' | 'completed' | 'failed';
  priority: number;
  input: any;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface ExecutionMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  parallelEfficiency: number;
  retryCount: number;
}

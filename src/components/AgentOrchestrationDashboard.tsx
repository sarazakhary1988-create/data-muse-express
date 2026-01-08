import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, GitBranch, Search, Database, Shield, CheckCircle2, 
  XCircle, Loader2, Play, Pause, RotateCcw, Zap, Network,
  Clock, TrendingUp, AlertTriangle, FileText, ChevronDown,
  ChevronRight, Activity, Cpu, Globe, Eye, ArrowRight, Wifi, WifiOff
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AgentState, ClaimVerification, QualityScore, PlanStep } from '@/lib/agent/types';

// WebSocket URL for Manus Realtime
const MANUS_WS_URL = 'wss://hhkbtwcmztozihipiszm.functions.supabase.co/functions/v1/manus-realtime';

// Types for the orchestration dashboard
interface SubAgentState {
  id: string;
  name: string;
  type: 'planner' | 'searcher' | 'scraper' | 'analyzer' | 'verifier' | 'writer' | 'enricher' | 'router';
  status: 'idle' | 'running' | 'completed' | 'failed' | 'queued';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  results?: {
    itemsProcessed: number;
    successRate: number;
  };
  currentTask?: string;
  source?: string; // Which tool/function is being used
}

interface VerificationNode {
  id: string;
  claim: string;
  status: 'pending' | 'verifying' | 'verified' | 'partial' | 'failed';
  confidence: number;
  sourceCount: number;
  contradictions: number;
}

interface OrchestrationState {
  mainState: AgentState;
  phase: 'planning' | 'execution' | 'verification' | 'synthesis' | 'complete';
  subAgents: SubAgentState[];
  verifications: VerificationNode[];
  quality: QualityScore;
  metrics: {
    totalSources: number;
    verifiedClaims: number;
    contradictions: number;
    executionTime: number;
  };
}

interface AgentOrchestrationDashboardProps {
  state?: Partial<OrchestrationState>;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  className?: string;
  compact?: boolean;
  /** Auto-connect to manus-realtime WebSocket for live updates */
  autoConnect?: boolean;
}

// Agent type configurations
const AGENT_CONFIG = {
  planner: { icon: GitBranch, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Planner' },
  searcher: { icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Searcher' },
  scraper: { icon: Database, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Scraper' },
  analyzer: { icon: Cpu, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Analyzer' },
  verifier: { icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Verifier' },
  writer: { icon: FileText, color: 'text-pink-500', bg: 'bg-pink-500/10', label: 'Writer' },
  enricher: { icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-500/10', label: 'Enricher' },
  router: { icon: Network, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Router' },
};

// State configurations
const STATE_CONFIG: Record<AgentState, { color: string; bg: string; icon: typeof Brain; label: string }> = {
  idle: { color: 'text-muted-foreground', bg: 'bg-muted', icon: Brain, label: 'Idle' },
  planning: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: GitBranch, label: 'Planning' },
  searching: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Search, label: 'Searching' },
  scraping: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Database, label: 'Scraping' },
  analyzing: { color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: Cpu, label: 'Analyzing' },
  verifying: { color: 'text-green-500', bg: 'bg-green-500/10', icon: Shield, label: 'Verifying' },
  compiling: { color: 'text-pink-500', bg: 'bg-pink-500/10', icon: FileText, label: 'Compiling' },
  completed: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2, label: 'Completed' },
  failed: { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle, label: 'Failed' },
};

// Demo data generator for visualization
function generateDemoState(): OrchestrationState {
  return {
    mainState: 'analyzing',
    phase: 'execution',
    subAgents: [
      { id: 'planner-1', name: 'Research Planner', type: 'planner', status: 'completed', progress: 100, results: { itemsProcessed: 5, successRate: 1 } },
      { id: 'searcher-1', name: 'Web Searcher', type: 'searcher', status: 'completed', progress: 100, results: { itemsProcessed: 24, successRate: 0.92 } },
      { id: 'searcher-2', name: 'News Searcher', type: 'searcher', status: 'completed', progress: 100, results: { itemsProcessed: 18, successRate: 0.89 } },
      { id: 'scraper-1', name: 'Content Scraper', type: 'scraper', status: 'running', progress: 75, currentTask: 'Extracting reuters.com...', results: { itemsProcessed: 15, successRate: 0.87 } },
      { id: 'analyzer-1', name: 'Content Analyzer', type: 'analyzer', status: 'running', progress: 45, currentTask: 'Analyzing patterns...', results: { itemsProcessed: 8, successRate: 0.95 } },
      { id: 'verifier-1', name: 'Fact Verifier', type: 'verifier', status: 'queued', progress: 0 },
      { id: 'writer-1', name: 'Report Writer', type: 'writer', status: 'idle', progress: 0 },
    ],
    verifications: [
      { id: 'v1', claim: 'Company X announced IPO valued at $2B', status: 'verified', confidence: 0.92, sourceCount: 4, contradictions: 0 },
      { id: 'v2', claim: 'Expected listing date Q2 2025', status: 'verifying', confidence: 0.78, sourceCount: 2, contradictions: 0 },
      { id: 'v3', claim: 'Revenue grew 45% YoY', status: 'partial', confidence: 0.65, sourceCount: 3, contradictions: 1 },
      { id: 'v4', claim: 'CEO stated expansion plans', status: 'pending', confidence: 0, sourceCount: 0, contradictions: 0 },
    ],
    quality: {
      overall: 0.78,
      accuracy: 0.85,
      completeness: 0.72,
      freshness: 0.91,
      sourceQuality: 0.82,
      claimVerification: 0.68,
    },
    metrics: {
      totalSources: 42,
      verifiedClaims: 12,
      contradictions: 2,
      executionTime: 45200,
    },
  };
}

// State flow visualization component
function StateFlowVisualization({ currentState, className }: { currentState: AgentState; className?: string }) {
  const states: AgentState[] = ['planning', 'searching', 'scraping', 'analyzing', 'verifying', 'compiling', 'completed'];
  const currentIndex = states.indexOf(currentState);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {states.map((state, index) => {
        const config = STATE_CONFIG[state];
        const Icon = config.icon;
        const isActive = state === currentState;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;

        return (
          <TooltipProvider key={state}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <motion.div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                      isActive && `${config.bg} ${config.color} ring-2 ring-offset-2 ring-offset-background`,
                      isPast && 'bg-emerald-500/20 text-emerald-500',
                      isFuture && 'bg-muted text-muted-foreground/50'
                    )}
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </motion.div>
                  {index < states.length - 1 && (
                    <ArrowRight className={cn(
                      'w-3 h-3 mx-0.5',
                      isPast ? 'text-emerald-500' : 'text-muted-foreground/30'
                    )} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">{config.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// Sub-agent card component
function SubAgentCard({ agent, compact }: { agent: SubAgentState; compact?: boolean }) {
  const config = AGENT_CONFIG[agent.type];
  const Icon = config.icon;

  const statusColors = {
    idle: 'bg-muted text-muted-foreground',
    queued: 'bg-amber-500/10 text-amber-500',
    running: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-emerald-500/10 text-emerald-500',
    failed: 'bg-destructive/10 text-destructive',
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center relative',
                config.bg
              )}
              animate={agent.status === 'running' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Icon className={cn('w-5 h-5', config.color)} />
              {agent.status === 'running' && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6">
                  <Progress value={agent.progress} className="h-1" />
                </div>
              )}
              {agent.status === 'completed' && (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 absolute -top-1 -right-1" />
              )}
              {agent.status === 'failed' && (
                <XCircle className="w-3 h-3 text-destructive absolute -top-1 -right-1" />
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium text-xs">{agent.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{agent.status} - {agent.progress}%</p>
            {agent.currentTask && (
              <p className="text-xs text-muted-foreground mt-1">{agent.currentTask}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border transition-all',
        agent.status === 'running' && 'border-primary/50 shadow-sm'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
            <Icon className={cn('w-4 h-4', config.color)} />
          </div>
          <div>
            <p className="text-sm font-medium">{agent.name}</p>
            {agent.currentTask && (
              <p className="text-xs text-muted-foreground truncate max-w-32">
                {agent.currentTask}
              </p>
            )}
          </div>
        </div>
        <Badge className={cn('text-[10px] capitalize', statusColors[agent.status])}>
          {agent.status === 'running' ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : agent.status === 'completed' ? (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          ) : null}
          {agent.status}
        </Badge>
      </div>
      <Progress value={agent.progress} className="h-1.5 mb-2" />
      {agent.results && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{agent.results.itemsProcessed} items</span>
          <span>{(agent.results.successRate * 100).toFixed(0)}% success</span>
        </div>
      )}
    </motion.div>
  );
}

// Verification flow component
function VerificationFlow({ verifications, compact }: { verifications: VerificationNode[]; compact?: boolean }) {
  const [expanded, setExpanded] = useState(!compact);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
    verifying: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    verified: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    partial: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const stats = useMemo(() => ({
    verified: verifications.filter(v => v.status === 'verified').length,
    partial: verifications.filter(v => v.status === 'partial').length,
    pending: verifications.filter(v => v.status === 'pending' || v.status === 'verifying').length,
  }), [verifications]);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Verification Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-500">{stats.verified} ✓</span>
              <span className="text-amber-500">{stats.partial} ⚡</span>
              <span className="text-muted-foreground">{stats.pending} ⏳</span>
            </div>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        {verifications.map((verification) => {
          const config = statusConfig[verification.status];
          const Icon = config.icon;

          return (
            <motion.div
              key={verification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'p-2 rounded-lg border flex items-start gap-2',
                verification.status === 'verifying' && 'border-blue-500/30'
              )}
            >
              <div className={cn('w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                <Icon className={cn('w-3.5 h-3.5', config.color, verification.status === 'verifying' && 'animate-spin')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{verification.claim}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Globe className="w-3 h-3" />
                    {verification.sourceCount} sources
                  </span>
                  <span>|</span>
                  <span className={cn(
                    verification.confidence >= 0.8 ? 'text-emerald-500' :
                    verification.confidence >= 0.5 ? 'text-amber-500' : 'text-muted-foreground'
                  )}>
                    {(verification.confidence * 100).toFixed(0)}% confident
                  </span>
                  {verification.contradictions > 0 && (
                    <>
                      <span>|</span>
                      <span className="text-destructive">
                        {verification.contradictions} contradiction{verification.contradictions > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Quality metrics visualization
function QualityMetrics({ quality, compact }: { quality: QualityScore; compact?: boolean }) {
  const metrics = [
    { label: 'Overall', value: quality.overall, color: 'bg-primary' },
    { label: 'Accuracy', value: quality.accuracy, color: 'bg-blue-500' },
    { label: 'Completeness', value: quality.completeness, color: 'bg-purple-500' },
    { label: 'Freshness', value: quality.freshness, color: 'bg-emerald-500' },
    { label: 'Source Quality', value: quality.sourceQuality, color: 'bg-amber-500' },
    { label: 'Verification', value: quality.claimVerification, color: 'bg-green-500' },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">{(quality.overall * 100).toFixed(0)}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="w-48">
              {metrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between text-xs py-0.5">
                  <span>{m.label}</span>
                  <span className="font-medium">{(m.value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Quality Score</span>
        <span className="text-lg font-bold text-primary">{(quality.overall * 100).toFixed(0)}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {metrics.slice(1).map((metric) => (
          <div key={metric.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="font-medium">{(metric.value * 100).toFixed(0)}%</span>
            </div>
            <Progress value={metric.value * 100} className="h-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Main dashboard component
export function AgentOrchestrationDashboard({
  state: externalState,
  onPause,
  onResume,
  onReset,
  className,
  compact = false,
  autoConnect = true,
}: AgentOrchestrationDashboardProps) {
  const [demoMode, setDemoMode] = useState(!externalState);
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<OrchestrationState>(externalState as OrchestrationState || generateDemoState());
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Map WebSocket message to OrchestrationState
  const mapWsStateToOrchestration = useCallback((wsState: any): Partial<OrchestrationState> => {
    // Map manus-realtime phases to AgentState
    const phaseToState: Record<string, AgentState> = {
      'idle': 'idle',
      'analyze': 'analyzing',
      'plan': 'planning',
      'execute': 'searching',
      'observe': 'scraping',
      'verify': 'verifying',
      'synthesize': 'compiling',
    };

    // Map sub-agents
    const subAgents: SubAgentState[] = (wsState.activeAgents || []).map((agent: any) => ({
      id: agent.id,
      name: agent.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Agent',
      type: mapAgentType(agent.type),
      status: agent.status as any,
      progress: agent.progress || 0,
      currentTask: agent.currentTask,
      results: agent.resultsCount ? { itemsProcessed: agent.resultsCount, successRate: 0.85 } : undefined,
    }));

    return {
      mainState: phaseToState[wsState.currentPhase] || 'analyzing',
      phase: wsState.currentPhase === 'verify' ? 'verification' : 
             wsState.currentPhase === 'synthesize' ? 'synthesis' :
             wsState.currentPhase === 'plan' ? 'planning' : 'execution',
      subAgents,
      metrics: {
        totalSources: wsState.metrics?.sourcesProcessed || 0,
        verifiedClaims: wsState.metrics?.validResultsStreamed || 0,
        contradictions: wsState.metrics?.rejectedResults || 0,
        executionTime: wsState.metrics?.executionTimeMs || 0,
      },
    };
  }, []);

  // Helper to map agent types from manus-realtime and command-router
  const mapAgentType = (type: string): SubAgentState['type'] => {
    const typeMap: Record<string, SubAgentState['type']> = {
      // Manus realtime agent types
      'news': 'searcher',
      'research': 'analyzer',
      'url_validation': 'verifier',
      'lead_enrichment': 'enricher',
      'explorium_enrichment': 'enricher',
      'cma_scraper': 'scraper',
      'tadawul_scraper': 'scraper',
      'sama_scraper': 'scraper',
      'custom_source_crawler': 'scraper',
      // Command router types
      'ai-scrape-command': 'scraper',
      'crawl4ai': 'scraper',
      'gpt-researcher': 'analyzer',
      'wide-research': 'searcher',
      'news-search': 'searcher',
      'research-command-router': 'router',
      'browser-use': 'scraper',
      'playwright-browser': 'scraper',
    };
    return typeMap[type] || 'analyzer';
  };

  // Connect to manus-realtime WebSocket
  useEffect(() => {
    if (!autoConnect || wsRef.current) return;

    console.log('[AgentOrchestrationDashboard] Connecting to manus-realtime WebSocket...');
    
    try {
      const ws = new WebSocket(MANUS_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AgentOrchestrationDashboard] WebSocket connected');
        setWsConnected(true);
        setDemoMode(false);
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'state_update':
              // Live state update from orchestrator
              const mappedState = mapWsStateToOrchestration(message.state);
              setState(prev => ({ ...prev, ...mappedState }));
              break;

            case 'agent_update':
              // Individual agent update
              setState(prev => {
                const updatedAgents = [...prev.subAgents];
                const agentIndex = updatedAgents.findIndex(a => a.id === message.agentId);
                if (agentIndex >= 0) {
                  updatedAgents[agentIndex] = {
                    ...updatedAgents[agentIndex],
                    status: message.status,
                    progress: message.progress || updatedAgents[agentIndex].progress,
                    currentTask: message.message || updatedAgents[agentIndex].currentTask,
                    results: message.resultsCount ? {
                      itemsProcessed: message.resultsCount,
                      successRate: 0.85,
                    } : updatedAgents[agentIndex].results,
                  };
                } else {
                  // New agent
                  updatedAgents.push({
                    id: message.agentId,
                    name: message.agentType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Agent',
                    type: mapAgentType(message.agentType),
                    status: message.status,
                    progress: message.progress || 0,
                    currentTask: message.message,
                  });
                }
                return { ...prev, subAgents: updatedAgents };
              });
              break;

            case 'result_stream':
              // Update metrics on new result
              setState(prev => ({
                ...prev,
                metrics: {
                  ...prev.metrics,
                  totalSources: prev.metrics.totalSources + 1,
                  verifiedClaims: message.validation?.urlValid && message.validation?.dateValid
                    ? prev.metrics.verifiedClaims + 1
                    : prev.metrics.verifiedClaims,
                },
              }));
              break;

            case 'research_complete':
              // Research finished
              setState(prev => ({
                ...prev,
                mainState: 'completed',
                phase: 'complete',
                metrics: {
                  ...prev.metrics,
                  totalSources: message.totalResults || prev.metrics.totalSources,
                  verifiedClaims: message.validResults || prev.metrics.verifiedClaims,
                  contradictions: message.rejectedResults || prev.metrics.contradictions,
                  executionTime: message.executionTimeMs || prev.metrics.executionTime,
                },
              }));
              break;

            case 'connected':
              console.log('[AgentOrchestrationDashboard] Connected with ID:', message.connectionId);
              break;

            case 'pong':
              // Keep-alive response
              break;
          }
        } catch (e) {
          console.error('[AgentOrchestrationDashboard] Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[AgentOrchestrationDashboard] WebSocket disconnected');
        setWsConnected(false);
        wsRef.current = null;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
      };

      ws.onerror = (error) => {
        console.error('[AgentOrchestrationDashboard] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[AgentOrchestrationDashboard] Failed to connect:', error);
    }

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [autoConnect, mapWsStateToOrchestration]);

  // Update state when external state changes (fallback)
  useEffect(() => {
    if (externalState && !wsConnected) {
      setState(prev => ({ ...prev, ...externalState } as OrchestrationState));
      setDemoMode(false);
    }
  }, [externalState, wsConnected]);

  // Demo mode animation
  useEffect(() => {
    if (!demoMode || isPaused) return;

    const interval = setInterval(() => {
      setState(prev => {
        const newState = { ...prev };
        // Animate sub-agents
        newState.subAgents = prev.subAgents.map(agent => {
          if (agent.status === 'running') {
            const newProgress = Math.min(100, agent.progress + Math.random() * 5);
            return {
              ...agent,
              progress: newProgress,
              status: newProgress >= 100 ? 'completed' : 'running',
            };
          }
          return agent;
        });
        return newState;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [demoMode, isPaused]);

  const handlePause = () => {
    setIsPaused(true);
    onPause?.();
  };

  const handleResume = () => {
    setIsPaused(false);
    onResume?.();
  };

  const handleReset = () => {
    setState(generateDemoState());
    setIsPaused(false);
    onReset?.();
  };

  const isRunning = state.mainState !== 'idle' && state.mainState !== 'completed' && state.mainState !== 'failed';
  const stateConfig = STATE_CONFIG[state.mainState];

  if (compact) {
    return (
      <Card className={cn('p-3', className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stateConfig.bg)}
              animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Brain className={cn('w-4 h-4', stateConfig.color)} />
            </motion.div>
            <div>
              <p className="text-sm font-semibold">Agent Orchestrator</p>
              <p className="text-xs text-muted-foreground capitalize">{state.mainState}</p>
            </div>
          </div>
          <QualityMetrics quality={state.quality} compact />
        </div>

        <StateFlowVisualization currentState={state.mainState} className="mb-3 justify-center" />

        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {state.subAgents.map((agent) => (
            <SubAgentCard key={agent.id} agent={agent} compact />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stateConfig.bg)}
            animate={isRunning ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Network className={cn('w-5 h-5', stateConfig.color)} />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Agent Orchestration
              {demoMode && (
                <Badge variant="outline" className="text-[10px]">Demo</Badge>
              )}
              {wsConnected ? (
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/50">
                  <Wifi className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground capitalize flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              {state.mainState}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={isPaused ? handleResume : handlePause}
              className="h-8"
            >
              {isPaused ? (
                <><Play className="w-3.5 h-3.5 mr-1" /> Resume</>
              ) : (
                <><Pause className="w-3.5 h-3.5 mr-1" /> Pause</>
              )}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleReset} className="h-8">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* State Flow */}
      <div className="mb-4 p-3 rounded-lg bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-2">Agent State Flow</p>
        <StateFlowVisualization currentState={state.mainState} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Globe className="w-4 h-4 mx-auto mb-1 text-blue-500" />
          <p className="text-lg font-bold">{state.metrics.totalSources}</p>
          <p className="text-[10px] text-muted-foreground">Sources</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold">{state.metrics.verifiedClaims}</p>
          <p className="text-[10px] text-muted-foreground">Verified</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold">{state.metrics.contradictions}</p>
          <p className="text-[10px] text-muted-foreground">Conflicts</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Clock className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
          <p className="text-lg font-bold">{(state.metrics.executionTime / 1000).toFixed(1)}s</p>
          <p className="text-[10px] text-muted-foreground">Time</p>
        </div>
      </div>

      {/* Sub-Agents Section */}
      <div className="mb-4">
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Sub-Agents ({state.subAgents.filter(a => a.status === 'completed').length}/{state.subAgents.length})
        </p>
        <div className="grid grid-cols-2 gap-2">
          {state.subAgents.map((agent) => (
            <SubAgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Verification Flow */}
      <div className="mb-4">
        <VerificationFlow verifications={state.verifications} />
      </div>

      {/* Quality Metrics */}
      <div className="p-3 rounded-lg bg-muted/30">
        <QualityMetrics quality={state.quality} />
      </div>
    </Card>
  );
}

export default AgentOrchestrationDashboard;

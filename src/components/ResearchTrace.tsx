import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Map, 
  Globe, 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  FileText,
  Clock,
  Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { useResearchStore, ResearchTask } from '@/store/researchStore';
import { ResearchPlan, ClaimVerification, QualityScore } from '@/lib/agent/types';

interface ResearchTraceProps {
  task: ResearchTask;
}

interface TraceStepProps {
  icon: React.ReactNode;
  title: string;
  status: 'completed' | 'active' | 'pending' | 'failed';
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const TraceStep = ({ icon, title, status, children, defaultOpen = false }: TraceStepProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const statusStyles = {
    completed: 'border-green-500/30 bg-green-500/5',
    active: 'border-primary/50 bg-primary/5 animate-pulse',
    pending: 'border-muted-foreground/20 bg-muted/50 opacity-50',
    failed: 'border-red-500/30 bg-red-500/5'
  };
  
  const iconStyles = {
    completed: 'text-green-500',
    active: 'text-primary',
    pending: 'text-muted-foreground',
    failed: 'text-red-500'
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border ${statusStyles[status]} transition-all duration-200`}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className={`${iconStyles[status]}`}>{icon}</div>
            <span className="font-medium flex-1 text-left">{title}</span>
            {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-border/50">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const ResearchTrace = ({ task }: ResearchTraceProps) => {
  const { agentState } = useResearchStore();
  const { plan, verifications, quality } = agentState;
  
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  // Extract unique domains from results
  const domains = [...new Set(task.results.map(r => r.metadata?.domain).filter(Boolean))];
  
  // Group verifications by status
  const verifiedClaims = (verifications || []).filter(v => v.status === 'verified');
  const partialClaims = (verifications || []).filter(v => v.status === 'partially_verified');
  const contradictedClaims = (verifications || []).filter(v => v.status === 'contradicted');
  const unverifiedClaims = (verifications || []).filter(v => v.status === 'unverified');

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3 pb-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Research Trace
          </h3>
          <p className="text-sm text-muted-foreground">
            Follow the agent's reasoning pipeline from query to conclusions
          </p>
        </div>

        {/* Step 1: Query Interpretation */}
        <TraceStep
          icon={<Target className="w-5 h-5" />}
          title="Query Interpretation"
          status={plan ? 'completed' : 'pending'}
          defaultOpen={true}
        >
          <div className="space-y-3 pt-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Original Query</p>
              <p className="text-sm font-medium bg-muted/50 p-2 rounded">{task.query}</p>
            </div>
            {plan && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Detected Intent</p>
                  <Badge variant="secondary" className="capitalize">
                    {plan.strategy.approach.replace('-', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Source Strategy</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.strategy.sourceTypes.map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs capitalize">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </TraceStep>

        {/* Step 2: Research Plan */}
        <TraceStep
          icon={<Map className="w-5 h-5" />}
          title="Research Plan"
          status={plan ? 'completed' : 'pending'}
        >
          <div className="space-y-3 pt-3">
            {plan ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Verification Level</p>
                    <p className="text-sm font-medium capitalize">{plan.strategy.verificationLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Sources</p>
                    <p className="text-sm font-medium">{plan.strategy.maxSources}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parallelism</p>
                    <p className="text-sm font-medium">{plan.strategy.parallelism}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <Badge variant={plan.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize">
                      {plan.priority}
                    </Badge>
                  </div>
                </div>
                
                {/* Plan Steps */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Execution Steps</p>
                  <div className="space-y-1">
                    {plan.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        <span className={step.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}>
                          {step.description}
                        </span>
                        {step.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Plan not yet generated</p>
            )}
          </div>
        </TraceStep>

        {/* Step 3: Sources Used */}
        <TraceStep
          icon={<Globe className="w-5 h-5" />}
          title={`Sources Used (${task.results.length})`}
          status={task.results.length > 0 ? 'completed' : 'pending'}
        >
          <div className="space-y-3 pt-3">
            {task.results.length > 0 ? (
              <>
                {/* Domain summary */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Domains ({domains.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {domains.slice(0, 10).map((domain, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {domain}
                      </Badge>
                    ))}
                    {domains.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{domains.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Source list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {task.results.slice(0, 8).map((result, i) => (
                    <div key={result.id} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{result.metadata.domain}</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.relevanceScore * 100)}%
                          </Badge>
                        </div>
                      </div>
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                  {task.results.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{task.results.length - 8} more sources
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No sources collected yet</p>
            )}
          </div>
        </TraceStep>

        {/* Step 4: Extracted Facts */}
        <TraceStep
          icon={<Lightbulb className="w-5 h-5" />}
          title="Extracted Facts"
          status={verifications.length > 0 ? 'completed' : 'pending'}
        >
          <div className="space-y-3 pt-3">
            {verifications.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-green-500/10 p-2 rounded">
                    <p className="text-green-500 font-medium">{verifiedClaims.length}</p>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                  <div className="bg-yellow-500/10 p-2 rounded">
                    <p className="text-yellow-500 font-medium">{partialClaims.length}</p>
                    <p className="text-xs text-muted-foreground">Partial</p>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded">
                    <p className="text-red-500 font-medium">{contradictedClaims.length}</p>
                    <p className="text-xs text-muted-foreground">Contradicted</p>
                  </div>
                  <div className="bg-muted/50 p-2 rounded">
                    <p className="text-muted-foreground font-medium">{unverifiedClaims.length}</p>
                    <p className="text-xs text-muted-foreground">Unverified</p>
                  </div>
                </div>
                
                {/* Top facts preview */}
                <div className="space-y-2">
                  {verifications.slice(0, 5).map((v) => (
                    <div key={v.id} className="text-sm p-2 bg-muted/30 rounded">
                      <div className="flex items-start gap-2">
                        {v.status === 'verified' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
                        {v.status === 'partially_verified' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
                        {v.status === 'contradicted' && <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                        {v.status === 'unverified' && <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
                        <p className="line-clamp-2">{v.claim}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No facts extracted yet</p>
            )}
          </div>
        </TraceStep>

        {/* Step 5: Verified/Contradicted Claims */}
        <TraceStep
          icon={<Brain className="w-5 h-5" />}
          title="Claim Verification"
          status={verifications.length > 0 ? 'completed' : 'pending'}
        >
          <div className="space-y-3 pt-3">
            {verifications.length > 0 ? (
              <div className="space-y-3">
                {/* Verified Claims */}
                {verifiedClaims.length > 0 && (
                  <div>
                    <p className="text-xs text-green-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified Claims ({verifiedClaims.length})
                    </p>
                    <div className="space-y-2">
                      {verifiedClaims.slice(0, 3).map((v) => (
                        <ClaimCard key={v.id} claim={v} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Contradicted Claims */}
                {contradictedClaims.length > 0 && (
                  <div>
                    <p className="text-xs text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Contradicted Claims ({contradictedClaims.length})
                    </p>
                    <div className="space-y-2">
                      {contradictedClaims.slice(0, 3).map((v) => (
                        <ClaimCard key={v.id} claim={v} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Partially Verified */}
                {partialClaims.length > 0 && (
                  <div>
                    <p className="text-xs text-yellow-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Partially Verified ({partialClaims.length})
                    </p>
                    <div className="space-y-2">
                      {partialClaims.slice(0, 3).map((v) => (
                        <ClaimCard key={v.id} claim={v} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No claims verified yet</p>
            )}
          </div>
        </TraceStep>

        {/* Quality Score Summary */}
        {isCompleted && (
          <TraceStep
            icon={<FileText className="w-5 h-5" />}
            title="Quality Summary"
            status="completed"
            defaultOpen={true}
          >
            <div className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <QualityMetric label="Overall" value={quality.overall} />
                <QualityMetric label="Accuracy" value={quality.accuracy} />
                <QualityMetric label="Completeness" value={quality.completeness} />
                <QualityMetric label="Source Quality" value={quality.sourceQuality} />
                <QualityMetric label="Freshness" value={quality.freshness} />
                <QualityMetric label="Verification" value={quality.claimVerification} />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Completed in{' '}
                  {task.completedAt
                    ? `${Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / 1000)}s`
                    : '--'}
                </span>
              </div>
            </div>
          </TraceStep>
        )}
      </div>
    </ScrollArea>
  );
};

// Helper Components
const ClaimCard = ({ claim }: { claim: ClaimVerification }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className="text-sm p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <p className={isExpanded ? '' : 'line-clamp-2'}>{claim.claim}</p>
      <AnimatePresence>
        {isExpanded && claim.sources.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-border/50"
          >
            <p className="text-xs text-muted-foreground mb-1">Supporting excerpts:</p>
            {claim.sources.slice(0, 2).map((src, i) => (
              <div key={i} className="text-xs text-muted-foreground bg-background/50 p-1.5 rounded mb-1">
                <p className="italic line-clamp-2">"{src.excerpt}"</p>
                <p className="text-primary/70 truncate mt-0.5">{src.domain}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 mt-1">
        <Badge 
          variant="outline" 
          className={`text-xs ${
            claim.status === 'verified' ? 'border-green-500/50 text-green-500' :
            claim.status === 'contradicted' ? 'border-red-500/50 text-red-500' :
            'border-yellow-500/50 text-yellow-500'
          }`}
        >
          {Math.round(claim.confidence * 100)}% confidence
        </Badge>
        <span className="text-xs text-muted-foreground">{claim.sources.length} sources</span>
      </div>
    </div>
  );
};

const QualityMetric = ({ label, value }: { label: string; value: number }) => {
  const percentage = Math.round(value * 100);
  const color = percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="bg-muted/30 p-2 rounded">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{percentage}%</p>
    </div>
  );
};

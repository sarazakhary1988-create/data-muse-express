import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Shield, Target, Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useResearchStore } from '@/store/researchStore';

const stateLabels: Record<string, string> = {
  idle: 'Ready',
  planning: 'Creating Strategy',
  searching: 'Searching Web',
  scraping: 'Extracting Content',
  analyzing: 'Analyzing Data',
  verifying: 'Verifying Claims',
  compiling: 'Compiling Report',
  completed: 'Complete',
  failed: 'Failed',
};

const stateIcons: Record<string, any> = {
  idle: Activity,
  planning: Brain,
  searching: Target,
  scraping: Zap,
  analyzing: Brain,
  verifying: Shield,
  compiling: CheckCircle2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

export const AgentStatusPanel = () => {
  const { agentState, isSearching } = useResearchStore();
  const { state, quality, metrics, lastDecision, verifications } = agentState;

  if (!isSearching && state === 'idle') return null;

  const StateIcon = stateIcons[state] || Activity;
  const isActive = isSearching && state !== 'completed' && state !== 'failed';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-2xl mx-auto mb-4"
      >
        <Card variant="glass" className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20 text-primary' : state === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <StateIcon className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold">Agent Status</h4>
                <p className="text-xs text-muted-foreground">{stateLabels[state]}</p>
              </div>
            </div>
            {lastDecision && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-sm font-medium">{(lastDecision.confidence * 100).toFixed(0)}%</p>
              </div>
            )}
          </div>

          {/* Decision */}
          {lastDecision && (
            <div className="mb-4 p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Current Decision</p>
              <p className="text-sm">{lastDecision.message}</p>
            </div>
          )}

          {/* Quality Scores */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Overall</p>
              <div className="relative">
                <Progress value={quality.overall * 100} className="h-2" />
                <p className="text-xs font-medium mt-1">{(quality.overall * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
              <div className="relative">
                <Progress value={quality.accuracy * 100} className="h-2" />
                <p className="text-xs font-medium mt-1">{(quality.accuracy * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Verification</p>
              <div className="relative">
                <Progress value={quality.claimVerification * 100} className="h-2" />
                <p className="text-xs font-medium mt-1">{(quality.claimVerification * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tasks: {metrics.completedTasks}/{metrics.totalTasks}</span>
            <span>Efficiency: {(metrics.parallelEfficiency * 100).toFixed(0)}%</span>
            <span>Claims: {verifications.filter(v => v.status === 'verified').length}/{verifications.length}</span>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, WifiOff, Brain, Globe, Database, Shield, Zap,
  Check, Loader2, AlertCircle, Activity, Clock, FileSearch,
  ChevronDown, ChevronUp, Settings2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useManusRealtime, ManusRealtimeState, SubAgentStatus } from '@/hooks/useManusRealtime';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { CustomSourceInput } from './CustomSourceInput';

interface ManusRealtimePanelProps {
  onResearchComplete?: (metrics: any) => void;
  className?: string;
  onSourcesChange?: (sources: string[]) => void;
}

const getAgentIcon = (type: SubAgentStatus['type']) => {
  switch (type) {
    case 'search': return Globe;
    case 'scrape': return Database;
    case 'validate': return Shield;
    case 'enrich': return Zap;
    case 'classify': return FileSearch;
    default: return Brain;
  }
};

const getStateColor = (state: ManusRealtimeState['state']) => {
  switch (state) {
    case 'idle': return 'bg-muted text-muted-foreground';
    case 'analyzing': return 'bg-blue-500/10 text-blue-500';
    case 'planning': return 'bg-purple-500/10 text-purple-500';
    case 'executing': return 'bg-primary/10 text-primary';
    case 'observing': return 'bg-amber-500/10 text-amber-500';
    case 'verifying': return 'bg-emerald-500/10 text-emerald-500';
    case 'synthesizing': return 'bg-cyan-500/10 text-cyan-500';
    case 'completed': return 'bg-green-500/10 text-green-500';
    case 'failed': return 'bg-destructive/10 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getAgentStatusIcon = (status: SubAgentStatus['status']) => {
  switch (status) {
    case 'completed': return <Check className="w-3 h-3" />;
    case 'running': return <Loader2 className="w-3 h-3 animate-spin" />;
    case 'failed': return <AlertCircle className="w-3 h-3" />;
    default: return <div className="w-3 h-3 rounded-full border border-current opacity-40" />;
  }
};

export function ManusRealtimePanel({ onResearchComplete, className, onSourcesChange }: ManusRealtimePanelProps) {
  const { isRTL } = useLanguage();
  const [showSourceSettings, setShowSourceSettings] = useState(false);
  const [customSources, setCustomSources] = useState<string[]>([]);
  
  const handleSourcesChange = useCallback((sources: string[]) => {
    setCustomSources(sources);
    onSourcesChange?.(sources);
  }, [onSourcesChange]);
  
  const { 
    isConnected, 
    connectionId, 
    state, 
    connect, 
    disconnect,
    cancelResearch 
  } = useManusRealtime({
    autoConnect: true,
    onComplete: onResearchComplete,
  });

  const isResearching = state.state !== 'idle' && state.state !== 'completed' && state.state !== 'failed';

  return (
    <Card variant="glass" className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Manus 1.7 MAX</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Realtime
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600">
            Web Crawl
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
              <Wifi className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-[10px]">
              <WifiOff className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
          
          {!isConnected && (
            <Button size="sm" variant="ghost" onClick={connect} className="h-6 text-xs">
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* State Badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge className={`${getStateColor(state.state)} border-0 capitalize`}>
          <Activity className="w-3 h-3 mr-1" />
          {state.state}
        </Badge>
        
        {isResearching && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={cancelResearch}
            className="h-6 text-xs text-destructive hover:text-destructive"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{state.currentStep}</span>
          <span>{Math.round(state.progress)}%</span>
        </div>
        <Progress value={state.progress} className="h-1.5" />
      </div>

      {/* Sub-Agents Grid */}
      <AnimatePresence>
        {state.subAgents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Sub-Agents
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {state.subAgents.map((agent) => {
                const Icon = getAgentIcon(agent.type);
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`
                      flex flex-col items-center p-2 rounded-lg text-[10px]
                      ${agent.status === 'running' ? 'bg-primary/10 text-primary' :
                        agent.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        agent.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted/50 text-muted-foreground'}
                    `}
                  >
                    <div className="relative mb-1">
                      <Icon className="w-4 h-4" />
                      <div className="absolute -bottom-0.5 -right-0.5">
                        {getAgentStatusIcon(agent.status)}
                      </div>
                    </div>
                    <span className="capitalize truncate w-full text-center">
                      {agent.type}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics */}
      <AnimatePresence>
        {(state.metrics.sourcesProcessed > 0 || state.metrics.factsExtracted > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-2 text-center"
          >
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="text-lg font-bold text-primary">
                {state.metrics.sourcesProcessed}
              </div>
              <div className="text-[10px] text-muted-foreground">Sources</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="text-lg font-bold text-primary">
                {state.metrics.factsExtracted}
              </div>
              <div className="text-[10px] text-muted-foreground">Facts</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                {(state.metrics.executionTimeMs / 1000).toFixed(1)}s
              </div>
              <div className="text-[10px] text-muted-foreground">Time</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Observations */}
      <AnimatePresence>
        {state.observations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-border/50"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Latest Observations
            </div>
            <div className="space-y-1">
              {state.observations.slice(-3).map((obs) => (
                <div 
                  key={obs.id}
                  className="text-[10px] text-muted-foreground flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="truncate">{obs.source}: {JSON.stringify(obs.data)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source Settings Collapsible */}
      <Collapsible open={showSourceSettings} onOpenChange={setShowSourceSettings} className="mt-4">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span>Configure Research Sources</span>
              {customSources.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {customSources.length} sources
                </Badge>
              )}
            </div>
            {showSourceSettings ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <CustomSourceInput 
            onSourcesChange={handleSourcesChange}
          />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default ManusRealtimePanel;
